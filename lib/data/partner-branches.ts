import "server-only";

import { branchProfiles, institutions } from "@/lib/fixtures/demo-data";
import {
  buildNarayanaHyderabadVerificationRows,
  mergeVerificationRows,
  NARAYANA_HYDERABAD_INSTITUTION_NAME,
} from "@/lib/fixtures/narayana-hyderabad";
import {
  buildPartnerBranchNormalizedKey,
  loadPartnerBranchMasterRowsFromFile,
  normalizeBranchLookupValue,
} from "@/lib/partner-branch-master";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  Branch,
  PartnerBranchImportBatch,
  PartnerBranchVerificationRow,
  PartnerBranchVerificationSnapshot,
  PartnerBranchVerificationStatus,
} from "@/types/domain";

const verificationStatuses: PartnerBranchVerificationStatus[] = [
  "imported",
  "reviewing",
  "verified",
  "rejected",
  "promoted",
];

function scoreFallbackMatch(row: {
  institution_name: string;
  city: string;
  district: string;
  area: string;
  pincode: string | null;
  address: string;
}) {
  return branchProfiles
    .map((branch) => {
      const institution = institutions.find((item) => item.id === branch.institution_id);
      const institutionName = normalizeBranchLookupValue(institution?.name ?? "");
      if (institutionName !== normalizeBranchLookupValue(row.institution_name)) {
        return { branch, score: 0 };
      }

      let score = 0;
      const area = normalizeBranchLookupValue(row.area);
      const city = normalizeBranchLookupValue(row.city);
      const district = normalizeBranchLookupValue(row.district);
      const branchText = normalizeBranchLookupValue(`${branch.name} ${branch.address}`);

      if (row.pincode && branch.pincode === row.pincode) score += 5;
      if (normalizeBranchLookupValue(branch.city) === city) score += 2;
      if (normalizeBranchLookupValue(branch.district) === district) score += 2;
      if (area && branchText.includes(area)) score += 4;

      return { branch, score };
    })
    .sort((left, right) => right.score - left.score)[0];
}

function buildCounts<T extends string>(values: T[]) {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].map(([key, count]) => ({ key, count }));
}

type PilotBranchSeedRow = Pick<
  Branch,
  | "id"
  | "institution_id"
  | "name"
  | "code"
  | "locality"
  | "district"
  | "city"
  | "state"
  | "pincode"
  | "address"
  | "pilot_scope"
  | "geo_cluster"
  | "verification_status"
  | "verification_notes"
  | "created_at"
  | "updated_at"
>;

function buildPilotRows(branches: PilotBranchSeedRow[]) {
  return buildNarayanaHyderabadVerificationRows(branches, {
    sourceName: "Hyderabad Narayana pilot seed",
    institutionName: NARAYANA_HYDERABAD_INSTITUTION_NAME,
  });
}

export async function getPartnerBranchVerificationSnapshot(): Promise<PartnerBranchVerificationSnapshot> {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const rows = await loadPartnerBranchMasterRowsFromFile();
    const mappedRows: PartnerBranchVerificationRow[] = rows.map((row) => {
      const matched = scoreFallbackMatch({
        institution_name: row.institution,
        city: row.city,
        district: row.district,
        area: row.area,
        pincode: row.pincode,
        address: row.address,
      });

      return {
        id: buildPartnerBranchNormalizedKey(row),
        import_batch_id: "local-csv-master",
        institution_name: row.institution,
        institution_id:
          institutions.find((institution) => normalizeBranchLookupValue(institution.name) === normalizeBranchLookupValue(row.institution))?.id ??
          null,
        state: row.state,
        district: row.district,
        city: row.city,
        area: row.area,
        pincode: row.pincode,
        address: row.address,
        location_type: row.location_type,
        confidence: row.confidence,
        source_url: row.source_url,
        notes: row.notes,
        normalized_key: buildPartnerBranchNormalizedKey(row),
        existing_branch_id: matched?.score >= 7 ? matched.branch.id : null,
        verification_status: "imported",
        verification_notes: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        promoted_at: null,
        raw_payload: row,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
        import_batch_source_name: "college-branch-master-ap-ts.csv",
        existing_branch_name: matched?.score >= 7 ? matched.branch.name : null,
        existing_branch_code: matched?.score >= 7 ? matched.branch.code : null,
        institution_display_name: row.institution,
      };
    });

    const pilotRows = buildPilotRows(branchProfiles);
    const combinedRows = mergeVerificationRows([...mappedRows, ...pilotRows]);

    const statusCounts = verificationStatuses.map((status) => ({
      status,
      count: combinedRows.filter((row) => row.verification_status === status).length,
    }));
    const confidenceCounts = buildCounts(combinedRows.map((row) => row.confidence)).map(({ key, count }) => ({
      confidence: key,
      count,
    }));

    return {
      source_label: "Local partner branch master CSV + Hyderabad Narayana pilot seed",
      total_rows: combinedRows.length,
      matched_rows: combinedRows.filter((row) => row.existing_branch_id).length,
      rows: combinedRows,
      status_counts: statusCounts,
      confidence_counts: confidenceCounts,
      import_batches: [],
    };
  }

  const [batchResponse, verificationResponse, branchResponse, institutionResponse] = await Promise.all([
    supabase.from("partner_branch_import_batches").select("*").order("imported_at", { ascending: false }),
    supabase.from("partner_branch_verifications").select("*").order("created_at", { ascending: false }),
    supabase
      .from("branches")
      .select("id, institution_id, name, code, branch_name, locality, district, city, state, pincode, address, pilot_scope, geo_cluster, verification_status, verification_notes, created_at, updated_at"),
    supabase.from("institutions").select("id, name"),
  ]);

  const batchRows = batchResponse.error ? [] : ((batchResponse.data ?? []) as PartnerBranchImportBatch[]);
  const verificationRows = verificationResponse.error ? [] : ((verificationResponse.data ?? []) as PartnerBranchVerificationRow[]);
  const branches = branchResponse.error ? [] : ((branchResponse.data ?? []) as PilotBranchSeedRow[]);
  const institutionRows = institutionResponse.error ? [] : ((institutionResponse.data ?? []) as Array<{ id: string; name: string }>);

  const batchMap = new Map(batchRows.map((row) => [row.id, row]));
  const branchMap = new Map(branches.map((branch) => [branch.id, branch]));
  const institutionMap = new Map(institutionRows.map((institution) => [institution.id, institution.name]));

  const rows = verificationRows.map((row) => {
    const matchedBranch = row.existing_branch_id ? branchMap.get(row.existing_branch_id) ?? null : null;
    return {
      ...row,
      import_batch_source_name: batchMap.get(row.import_batch_id)?.source_name ?? null,
      existing_branch_name: matchedBranch?.name ?? null,
      existing_branch_code: matchedBranch?.code ?? null,
      institution_display_name: row.institution_id ? institutionMap.get(row.institution_id) ?? row.institution_name : row.institution_name,
      branch_verification_status: matchedBranch?.verification_status ?? null,
    };
  });

  const pilotRows = buildPilotRows(branches);
  const combinedRows = mergeVerificationRows([...rows, ...pilotRows]);

  const statusCounts = verificationStatuses.map((status) => ({
    status,
    count: combinedRows.filter((row) => row.verification_status === status).length,
  }));
  const confidenceCounts = buildCounts(combinedRows.map((row) => row.confidence)).map(({ key, count }) => ({
    confidence: key,
    count,
  }));

  return {
    source_label:
      batchRows.length > 0
        ? "Supabase partner branch verification queue + Hyderabad Narayana pilot seed"
        : "Supabase partner branch verification queue (with Hyderabad Narayana pilot seed)",
    total_rows: combinedRows.length,
    matched_rows: combinedRows.filter((row) => row.existing_branch_id).length,
    rows: combinedRows,
    status_counts: statusCounts,
    confidence_counts: confidenceCounts,
    import_batches: batchRows,
  };
}
