import { randomUUID } from "crypto";

import { basename, resolve } from "path";

import type { SupabaseClient } from "@supabase/supabase-js";

import { seedData } from "../fixtures/demo-data";
import { slugifyFilename } from "../import/normalizers";
import { commitLeadImport } from "../import/parser";
import {
  buildPartnerBranchNormalizedKey,
  loadPartnerBranchMasterRowsFromFile,
  normalizeBranchLookupValue,
} from "../partner-branch-master";
import type { LeadImportCommitResult, LeadImportPreparedBatchRow } from "../import/types";
import type { Database, TableInsert } from "../../types/database";
import type { LeadOptInStatus } from "../../types/domain";

type AdminSupabaseClient = SupabaseClient<Database>;

type PartnerTrustTableName =
  | "institutions"
  | "branches"
  | "branch_contacts"
  | "branch_assets"
  | "branch_trust_assets"
  | "branch_reviews"
  | "branch_fee_snapshots"
  | "seat_inventory_snapshots"
  | "commission_rules";

const partnerTrustTableOrder = [
  "institutions",
  "branches",
  "branch_contacts",
  "branch_assets",
  "branch_trust_assets",
  "branch_reviews",
  "branch_fee_snapshots",
  "seat_inventory_snapshots",
  "commission_rules",
] as const satisfies readonly PartnerTrustTableName[];

export interface PartnerTrustSyncOptions {
  includeBranchAssets?: boolean;
  includeTrustAssets?: boolean;
  includeReviews?: boolean;
  includeFeeSnapshots?: boolean;
  includeSeatInventory?: boolean;
  includeCommissionRules?: boolean;
}

export interface PartnerTrustSyncTableResult {
  table: PartnerTrustTableName;
  rows: number;
}

export interface PartnerTrustSyncResult {
  persistence: "supabase";
  synced_at: string;
  total_rows: number;
  tables: PartnerTrustSyncTableResult[];
}

export interface LiveSupabaseLeadImportResult extends LeadImportCommitResult {
  persistence: "supabase";
  batch_slug: string;
  campaign_id: string;
  campaign_name: string;
  inserted_opt_ins: number;
  opt_in_status: LeadOptInStatus;
  source_path: string | null;
}

export interface LiveSupabaseLeadImportOptions {
  supabase: AdminSupabaseClient;
  buffer: Buffer;
  fileName: string;
  sourcePath?: string | null;
  existingPhones?: Iterable<string>;
  batchSize?: number;
  optInStatus?: LeadOptInStatus;
  capturedFrom?: string | null;
  ownerUserId?: string | null;
}

export interface PartnerBranchMasterImportOptions {
  supabase: AdminSupabaseClient;
  filePath?: string;
  importedByUserId?: string | null;
}

export interface PartnerBranchMasterImportResult {
  persistence: "supabase";
  source_name: string;
  source_path: string;
  import_batch_id: string;
  total_rows: number;
  matched_rows: number;
  institution_matches: number;
  status: "completed";
}

function isEnabled(value: boolean | undefined, defaultValue = true) {
  return value ?? defaultValue;
}

function buildPartnerTrustTableRows(options: PartnerTrustSyncOptions) {
  const enabledTables = new Set<PartnerTrustTableName>(
    partnerTrustTableOrder.filter((table) => {
      if (table === "branch_assets") return isEnabled(options.includeBranchAssets);
      if (table === "branch_trust_assets") return isEnabled(options.includeTrustAssets);
      if (table === "branch_reviews") return isEnabled(options.includeReviews);
      if (table === "branch_fee_snapshots") return isEnabled(options.includeFeeSnapshots);
      if (table === "seat_inventory_snapshots") return isEnabled(options.includeSeatInventory);
      if (table === "commission_rules") return isEnabled(options.includeCommissionRules);
      return true;
    }),
  );

  return partnerTrustTableOrder
    .filter((table) => enabledTables.has(table))
    .map((table) => ({
      table,
      rows: seedData[table] as TableInsert<typeof table>[],
    }));
}

async function upsertRows<TTable extends PartnerTrustTableName>(
  supabase: AdminSupabaseClient,
  table: TTable,
  rows: TableInsert<TTable>[],
) {
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from(table as never).upsert(rows as never, { onConflict: "id" });

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function deleteImportedBatch(supabase: AdminSupabaseClient, leadIds: string[]) {
  if (leadIds.length === 0) {
    return;
  }

  const [{ error: optInDeleteError }, { error: eventDeleteError }, { error: leadDeleteError }] = await Promise.all([
    supabase.from("lead_opt_ins").delete().in("lead_id", leadIds),
    supabase.from("lead_events").delete().in("lead_id", leadIds),
    supabase.from("leads").delete().in("id", leadIds),
  ]);

  if (optInDeleteError || eventDeleteError || leadDeleteError) {
    const cleanupErrors = [optInDeleteError, eventDeleteError, leadDeleteError]
      .filter(Boolean)
      .map((error) => error?.message)
      .join("; ");
    throw new Error(`Batch cleanup failed after partial import: ${cleanupErrors}`);
  }
}

function buildImportCampaign(args: {
  campaignId: string;
  fileName: string;
  batchSlug: string;
  targetCount: number;
  importedAt: string;
}): TableInsert<"campaigns"> {
  return {
    id: args.campaignId,
    name: `Lead import - ${args.fileName}`,
    source_batch: args.batchSlug,
    template_name: "lead_import",
    target_count: args.targetCount,
    sent_count: 0,
    reply_count: 0,
    qualified_count: 0,
    payment_count: 0,
    admission_count: 0,
    status: "completed",
    created_at: args.importedAt,
    updated_at: args.importedAt,
  };
}

function buildLeadOptInRows(args: {
  batch: LeadImportPreparedBatchRow[];
  batchSlug: string;
  fileName: string;
  importedAt: string;
  optInStatus: LeadOptInStatus;
  capturedFrom: string;
  sourcePath: string | null;
}): TableInsert<"lead_opt_ins">[] {
  return args.batch.map((item) => ({
    id: randomUUID(),
    lead_id: item.lead.id as string,
    channel: "whatsapp",
    status: args.optInStatus,
    captured_from: args.capturedFrom,
    captured_at: args.optInStatus === "opted_in" ? args.importedAt : null,
    expires_at: null,
    payload: {
      batch_slug: args.batchSlug,
      imported_at: args.importedAt,
      source_file: args.fileName,
      source_path: args.sourcePath,
    },
  }));
}

function buildInstitutionLookupKeys(institution: { name: string; slug: string; short_name: string | null }) {
  return [institution.name, institution.slug.replace(/-/g, " "), institution.short_name]
    .filter(Boolean)
    .map((value) => normalizeBranchLookupValue(value));
}

function scoreExistingBranchMatch(args: {
  row: {
    city: string;
    district: string;
    area: string;
    address: string;
    pincode: string | null;
  };
  institutionId: string | null;
  branch: {
    institution_id: string | null;
    name: string;
    city: string;
    district: string;
    pincode: string;
    address: string;
  };
}) {
  if (args.institutionId && args.branch.institution_id !== args.institutionId) {
    return 0;
  }

  let score = 0;
  const rowCity = normalizeBranchLookupValue(args.row.city);
  const rowDistrict = normalizeBranchLookupValue(args.row.district);
  const rowArea = normalizeBranchLookupValue(args.row.area);
  const rowAddress = normalizeBranchLookupValue(args.row.address);
  const branchCity = normalizeBranchLookupValue(args.branch.city);
  const branchDistrict = normalizeBranchLookupValue(args.branch.district);
  const branchSearchText = normalizeBranchLookupValue(`${args.branch.name} ${args.branch.address}`);

  if (args.row.pincode && args.branch.pincode === args.row.pincode) {
    score += 5;
  }

  if (rowCity && branchCity === rowCity) {
    score += 2;
  }

  if (rowDistrict && branchDistrict === rowDistrict) {
    score += 2;
  }

  if (rowArea && branchSearchText.includes(rowArea)) {
    score += 4;
  }

  if (rowAddress && branchSearchText.includes(rowAddress.slice(0, Math.min(rowAddress.length, 28)))) {
    score += 2;
  }

  return score;
}

function resolveExistingBranchMatch(args: {
  row: {
    city: string;
    district: string;
    area: string;
    address: string;
    pincode: string | null;
  };
  institutionId: string | null;
  branches: Array<{
    id: string;
    institution_id: string | null;
    name: string;
    code: string;
    city: string;
    district: string;
    pincode: string;
    address: string;
  }>;
}) {
  let bestMatch: { id: string; name: string; code: string } | null = null;
  let bestScore = 0;

  for (const branch of args.branches) {
    const score = scoreExistingBranchMatch({
      row: args.row,
      institutionId: args.institutionId,
      branch,
    });

    if (score > bestScore) {
      bestScore = score;
      bestMatch = branch;
    }
  }

  return bestScore >= 7 ? bestMatch : null;
}

export async function getExistingLeadPhonesFromSupabase(supabase: AdminSupabaseClient) {
  const { data, error } = await supabase.from("leads").select("parent_phone, student_phone");

  if (error) {
    throw new Error(`Unable to load existing lead phones: ${error.message}`);
  }

  const phoneRows = (data ?? []) as Array<{ parent_phone: string | null; student_phone: string | null }>;
  return phoneRows.flatMap((lead) => [lead.parent_phone, lead.student_phone]).filter(Boolean) as string[];
}

export async function importLeadFileToSupabase({
  supabase,
  buffer,
  fileName,
  sourcePath = null,
  existingPhones = [],
  batchSize = 500,
  optInStatus = "unknown",
  capturedFrom = "lead_import",
  ownerUserId = null,
}: LiveSupabaseLeadImportOptions): Promise<LiveSupabaseLeadImportResult> {
  const importedAt = new Date().toISOString();
  const batchSlug = slugifyFilename(fileName);
  const campaignId = randomUUID();
  const campaignName = `Lead import - ${fileName}`;
  const optInCapturedFrom = capturedFrom ?? "lead_import";
  let insertedOptIns = 0;

  const initialCampaignRow = buildImportCampaign({
    campaignId,
    fileName,
    batchSlug,
    targetCount: 0,
    importedAt,
  });
  const { error: initialCampaignError } = await supabase
    .from("campaigns")
    .upsert([initialCampaignRow] as never, { onConflict: "id" });

  if (initialCampaignError) {
    throw new Error(`Import campaign setup failed: ${initialCampaignError.message}`);
  }

  try {
    const result = await commitLeadImport({
      buffer,
      fileName,
      existingPhones,
      batchSize,
      insertBatch: async (batch) => {
        const leadRows = batch.map((item) => ({
          ...item.lead,
          owner_user_id: ownerUserId ?? item.lead.owner_user_id ?? null,
        })) as TableInsert<"leads">[];
        const eventRows = batch.map((item) => item.event) as TableInsert<"lead_events">[];
        const optInRows = buildLeadOptInRows({
          batch,
          batchSlug,
          fileName,
          importedAt,
          optInStatus,
          capturedFrom: optInCapturedFrom,
          sourcePath,
        });
        const leadIds = leadRows.map((row) => row.id).filter(Boolean) as string[];

        const { error: leadError } = await supabase.from("leads").insert(leadRows as never);
        if (leadError) {
          throw new Error(`Lead insert failed: ${leadError.message}`);
        }

        const { error: eventError } = await supabase.from("lead_events").insert(eventRows as never);
        if (eventError) {
          await deleteImportedBatch(supabase, leadIds);
          throw new Error(`Lead event insert failed: ${eventError.message}`);
        }

        const { error: optInError } = await supabase.from("lead_opt_ins").insert(optInRows as never);
        if (optInError) {
          await deleteImportedBatch(supabase, leadIds);
          throw new Error(`Lead opt-in insert failed: ${optInError.message}`);
        }

        insertedOptIns += optInRows.length;
      },
    });

    const campaignRow = buildImportCampaign({
      campaignId,
      fileName,
      batchSlug,
      targetCount: result.inserted_rows,
      importedAt,
    });
    const { error: campaignError } = await supabase
      .from("campaigns")
      .upsert([{ ...campaignRow, updated_at: new Date().toISOString() }] as never, { onConflict: "id" });

    if (campaignError) {
      throw new Error(`Import campaign finalize failed: ${campaignError.message}`);
    }

    return {
      ...result,
      persistence: "supabase",
      batch_slug: batchSlug,
      campaign_id: campaignId,
      campaign_name: campaignName,
      inserted_opt_ins: insertedOptIns,
      opt_in_status: optInStatus,
      source_path: sourcePath,
    };
  } catch (error) {
    await supabase.from("campaigns").delete().eq("id", campaignId);
    throw error;
  }
}

export async function syncPartnerTrustSeedData(
  supabase: AdminSupabaseClient,
  options: PartnerTrustSyncOptions = {},
): Promise<PartnerTrustSyncResult> {
  const syncPlan = buildPartnerTrustTableRows(options);
  const tables: PartnerTrustSyncTableResult[] = [];

  for (const step of syncPlan) {
    await upsertRows(supabase, step.table, step.rows);
    tables.push({
      table: step.table,
      rows: step.rows.length,
    });
  }

  return {
    persistence: "supabase",
    synced_at: new Date().toISOString(),
    total_rows: tables.reduce((sum, step) => sum + step.rows, 0),
    tables,
  };
}

export async function importPartnerBranchMasterToSupabase({
  supabase,
  filePath,
  importedByUserId = null,
}: PartnerBranchMasterImportOptions): Promise<PartnerBranchMasterImportResult> {
  const absolutePath = resolve(filePath ?? "data/partners/college-branch-master-ap-ts.csv");
  const sourceName = basename(absolutePath);
  const rows = await loadPartnerBranchMasterRowsFromFile(absolutePath);
  const importBatchId = randomUUID();
  const importedAt = new Date().toISOString();

  const [{ data: institutionRows, error: institutionError }, { data: branchRows, error: branchError }] = await Promise.all([
    supabase.from("institutions").select("id, name, slug, short_name"),
    supabase.from("branches").select("id, institution_id, name, code, city, district, pincode, address"),
  ]);

  if (institutionError) {
    throw new Error(`Unable to load institutions for branch import: ${institutionError.message}`);
  }

  if (branchError) {
    throw new Error(`Unable to load existing branches for branch import: ${branchError.message}`);
  }

  const institutions = (institutionRows ?? []) as Array<{
    id: string;
    name: string;
    slug: string;
    short_name: string | null;
  }>;
  const branches = (branchRows ?? []) as Array<{
    id: string;
    institution_id: string | null;
    name: string;
    code: string;
    city: string;
    district: string;
    pincode: string;
    address: string;
  }>;

  const institutionLookup = new Map<string, string>();
  institutions.forEach((institution) => {
    buildInstitutionLookupKeys(institution).forEach((key) => institutionLookup.set(key, institution.id));
  });

  const verificationRows: TableInsert<"partner_branch_verifications">[] = rows.map((row) => {
    const institutionId = institutionLookup.get(normalizeBranchLookupValue(row.institution)) ?? null;
    const matchedBranch = resolveExistingBranchMatch({
      row,
      institutionId,
      branches,
    });

    return {
      id: randomUUID(),
      import_batch_id: importBatchId,
      institution_name: row.institution,
      institution_id: institutionId,
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
      existing_branch_id: matchedBranch?.id ?? null,
      verification_status: "imported",
      verification_notes: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      promoted_at: null,
      raw_payload: row,
      created_at: importedAt,
      updated_at: importedAt,
    };
  });

  const matchedRows = verificationRows.filter((row) => row.existing_branch_id).length;
  const institutionMatches = verificationRows.filter((row) => row.institution_id).length;

  const { error: batchError } = await supabase.from("partner_branch_import_batches").insert([
    {
      id: importBatchId,
      source_name: sourceName,
      source_path: absolutePath,
      row_count: verificationRows.length,
      matched_branch_count: matchedRows,
      imported_by_user_id: importedByUserId,
      import_status: "pending",
      error_message: null,
      imported_at: importedAt,
      created_at: importedAt,
      updated_at: importedAt,
    },
  ] as never);

  if (batchError) {
    throw new Error(`Branch import batch setup failed: ${batchError.message}`);
  }

  try {
    const { error: verificationError } = await supabase
      .from("partner_branch_verifications")
      .insert(verificationRows as never);

    if (verificationError) {
      throw new Error(`Branch verification import failed: ${verificationError.message}`);
    }

    const { error: finalizeError } = await supabase
      .from("partner_branch_import_batches")
      .update({
        import_status: "completed",
        row_count: verificationRows.length,
        matched_branch_count: matchedRows,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", importBatchId);

    if (finalizeError) {
      throw new Error(`Branch import batch finalize failed: ${finalizeError.message}`);
    }
  } catch (error) {
    await supabase
      .from("partner_branch_import_batches")
      .update({
        import_status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown branch import failure",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", importBatchId);
    throw error;
  }

  return {
    persistence: "supabase",
    source_name: sourceName,
    source_path: absolutePath,
    import_batch_id: importBatchId,
    total_rows: verificationRows.length,
    matched_rows: matchedRows,
    institution_matches: institutionMatches,
    status: "completed",
  };
}

export type { PartnerTrustTableName };
