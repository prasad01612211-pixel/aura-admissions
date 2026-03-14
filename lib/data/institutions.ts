import "server-only";

import { branches, commissionRules, institutions } from "@/lib/fixtures/demo-data";
import {
  commissionLedgers as fixtureCommissionLedgers,
  conversions as fixtureConversions,
} from "@/lib/fixtures/operations-data";
import { getLocalActiveContext } from "@/lib/data/local-state";
import {
  readRuntimeCommissionLedgers,
  readRuntimeConversions,
} from "@/lib/runtime/ops-store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Branch, CommissionRule, Institution } from "@/types/domain";
import type { CommissionLedger, Conversion } from "@/types/operations";

export type InstitutionSnapshotRow = {
  institution_id: string;
  institution_name: string;
  website_url: string | null;
  branch_count: number;
  current_commission: number | null;
  commission_trigger: string | null;
  admissions_confirmed: number;
  commission_eligible: number;
  pending_payouts: number;
  paid_payouts: number;
};

export type InstitutionSnapshot = {
  data_source: "fixtures" | "local_import" | "supabase";
  source_label: string;
  rows: InstitutionSnapshotRow[];
};

function mergeRowsById<T extends { id: string }>(rows: T[]) {
  const merged = new Map<string, T>();
  rows.forEach((row) => merged.set(row.id, row));
  return [...merged.values()];
}

function buildInstitutionSnapshot(args: {
  branchRows: Branch[];
  commissionLedgerRows: CommissionLedger[];
  commissionRuleRows: CommissionRule[];
  conversionRows: Conversion[];
  dataSource: InstitutionSnapshot["data_source"];
  institutionRows: Institution[];
  sourceLabel: string;
}) {
  return {
    data_source: args.dataSource,
    source_label: args.sourceLabel,
    rows: args.institutionRows
      .map((institution) => {
        const institutionBranchIds = new Set(args.branchRows.filter((branch) => branch.institution_id === institution.id).map((branch) => branch.id));
        const scopedConversions = args.conversionRows.filter((conversion) => institutionBranchIds.has(conversion.branch_id));
        const scopedConversionIds = new Set(scopedConversions.map((conversion) => conversion.id));
        const scopedLedgers = args.commissionLedgerRows.filter((ledger) => scopedConversionIds.has(ledger.conversion_id));
        const activeRule =
          args.commissionRuleRows.find((rule) => rule.institution_id === institution.id && rule.active && !rule.branch_id) ??
          args.commissionRuleRows.find((rule) => rule.institution_id === institution.id && rule.active) ??
          null;

        return {
          institution_id: institution.id,
          institution_name: institution.name,
          website_url: institution.website_url,
          branch_count: institutionBranchIds.size,
          current_commission: activeRule?.payout_amount ?? null,
          commission_trigger: activeRule?.trigger ?? null,
          admissions_confirmed: scopedConversions.filter((conversion) => conversion.joined_status === "confirmed").length,
          commission_eligible: scopedLedgers.filter((ledger) => ledger.payout_status !== "not_ready").length,
          pending_payouts: scopedLedgers.filter((ledger) => ledger.payout_status === "ready" || ledger.payout_status === "invoiced").length,
          paid_payouts: scopedLedgers.filter((ledger) => ledger.payout_status === "received").length,
        } satisfies InstitutionSnapshotRow;
      })
      .sort((left, right) => right.branch_count - left.branch_count || right.commission_eligible - left.commission_eligible),
  } satisfies InstitutionSnapshot;
}

export async function getInstitutionSnapshot(): Promise<InstitutionSnapshot> {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const [localContext, runtimeConversions, runtimeLedgers] = await Promise.all([
      getLocalActiveContext(),
      readRuntimeConversions(),
      readRuntimeCommissionLedgers(),
    ]);

    return buildInstitutionSnapshot({
      branchRows: localContext.branches.length > 0 ? localContext.branches : branches,
      commissionLedgerRows: mergeRowsById([...fixtureCommissionLedgers, ...runtimeLedgers]),
      commissionRuleRows: commissionRules,
      conversionRows: mergeRowsById([...fixtureConversions, ...runtimeConversions]),
      dataSource: localContext.data_source,
      institutionRows: institutions,
      sourceLabel: localContext.source_label,
    });
  }

  const [{ data: branchRows }, { data: institutionRows }, { data: commissionRuleRows }, { data: conversionRows }, { data: commissionLedgerRows }] =
    await Promise.all([
      supabase.from("branches").select("*").eq("active", true),
      supabase.from("institutions").select("*").eq("active", true),
      supabase.from("commission_rules").select("*").eq("active", true),
      supabase.from("conversions").select("*"),
      supabase.from("commission_ledgers").select("*"),
    ]);

  return buildInstitutionSnapshot({
    branchRows: (branchRows ?? []) as Branch[],
    commissionLedgerRows: (commissionLedgerRows ?? []) as CommissionLedger[],
    commissionRuleRows: (commissionRuleRows ?? []) as CommissionRule[],
    conversionRows: (conversionRows ?? []) as Conversion[],
    dataSource: "supabase",
    institutionRows: (institutionRows ?? []) as Institution[],
    sourceLabel: "Supabase",
  });
}
