import "server-only";

import { branches, institutions } from "@/lib/fixtures/demo-data";
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
import { formatCurrency } from "@/lib/utils";
import type { Branch, Institution } from "@/types/domain";
import type { CommissionLedger, Conversion } from "@/types/operations";

type RevenueSummaryCard = {
  label: string;
  value: string;
  helper: string;
};

type RevenueInstitutionRow = {
  institution_id: string;
  institution_name: string;
  branches: number;
  admissions_confirmed: number;
  commission_eligible: number;
  pending_amount: number;
  paid_amount: number;
  due_count: number;
};

type RevenuePayoutRow = {
  payout_id: string;
  institution_name: string;
  branch_name: string | null;
  gross_amount: number;
  status: CommissionLedger["payout_status"];
  due_at: string | null;
  paid_at: string | null;
  notes: string | null;
};

export type RevenueSnapshot = {
  data_source: "fixtures" | "local_import" | "supabase";
  source_label: string;
  summary: RevenueSummaryCard[];
  institutions: RevenueInstitutionRow[];
  payouts: RevenuePayoutRow[];
};

function mergeRowsById<T extends { id: string }>(rows: T[]) {
  const merged = new Map<string, T>();
  rows.forEach((row) => merged.set(row.id, row));
  return [...merged.values()];
}

function pendingLike(status: CommissionLedger["payout_status"]) {
  return status === "ready" || status === "invoiced";
}

function buildRevenueSnapshot(args: {
  branchRows: Branch[];
  commissionRows: CommissionLedger[];
  conversionRows: Conversion[];
  dataSource: RevenueSnapshot["data_source"];
  institutionRows: Institution[];
  sourceLabel: string;
}) {
  const branchMap = new Map(args.branchRows.map((branch) => [branch.id, branch]));
  const institutionMap = new Map(args.institutionRows.map((institution) => [institution.id, institution]));
  const conversionMap = new Map(args.conversionRows.map((conversion) => [conversion.id, conversion]));

  const institutionRows = args.institutionRows
    .map((institution) => {
      const institutionBranchIds = new Set(args.branchRows.filter((branch) => branch.institution_id === institution.id).map((branch) => branch.id));
      const scopedConversions = args.conversionRows.filter((conversion) => institutionBranchIds.has(conversion.branch_id));
      const scopedConversionIds = new Set(scopedConversions.map((conversion) => conversion.id));
      const scopedLedgers = args.commissionRows.filter((ledger) => scopedConversionIds.has(ledger.conversion_id));

      return {
        institution_id: institution.id,
        institution_name: institution.name,
        branches: institutionBranchIds.size,
        admissions_confirmed: scopedConversions.filter((conversion) => conversion.joined_status === "confirmed").length,
        commission_eligible: scopedLedgers.filter((ledger) => ledger.payout_status !== "not_ready").length,
        pending_amount: scopedLedgers.filter((ledger) => pendingLike(ledger.payout_status)).reduce((sum, ledger) => sum + ledger.expected_amount, 0),
        paid_amount: scopedLedgers.filter((ledger) => ledger.payout_status === "received").reduce((sum, ledger) => sum + ledger.expected_amount, 0),
        due_count: scopedLedgers.filter((ledger) => pendingLike(ledger.payout_status)).length,
      } satisfies RevenueInstitutionRow;
    })
    .sort((left, right) => right.pending_amount - left.pending_amount || right.commission_eligible - left.commission_eligible);

  const payouts = args.commissionRows
    .map((row) => {
      const conversion = conversionMap.get(row.conversion_id);
      const branch = conversion ? branchMap.get(conversion.branch_id) ?? null : null;
      const institution = branch?.institution_id ? institutionMap.get(branch.institution_id) ?? null : null;

      return {
        payout_id: row.id,
        institution_name: institution?.name ?? "Unknown institution",
        branch_name: branch?.name ?? null,
        gross_amount: row.expected_amount,
        status: row.payout_status,
        due_at: row.payout_due_date,
        paid_at: row.payout_received_at,
        notes: row.notes,
      } satisfies RevenuePayoutRow;
    })
    .sort((left, right) => (right.due_at ?? right.paid_at ?? "").localeCompare(left.due_at ?? left.paid_at ?? ""));

  const expectedAmount = args.commissionRows.reduce((sum, row) => sum + row.expected_amount, 0);
  const readyAmount = args.commissionRows
    .filter((row) => pendingLike(row.payout_status))
    .reduce((sum, row) => sum + row.expected_amount, 0);
  const paidAmount = args.commissionRows
    .filter((row) => row.payout_status === "received")
    .reduce((sum, row) => sum + row.expected_amount, 0);
  const disputedAmount = args.commissionRows
    .filter((row) => row.payout_status === "disputed")
    .reduce((sum, row) => sum + row.expected_amount, 0);

  return {
    data_source: args.dataSource,
    source_label: args.sourceLabel,
    summary: [
      {
        label: "Expected revenue",
        value: formatCurrency(expectedAmount),
        helper: "Commission expectation based on current conversions and active rules.",
      },
      {
        label: "Ready for payout",
        value: formatCurrency(readyAmount),
        helper: "Ledger rows already ready or invoiced with partner colleges.",
      },
      {
        label: "Received revenue",
        value: formatCurrency(paidAmount),
        helper: "Settled payouts already marked as received.",
      },
      {
        label: "Disputed amount",
        value: formatCurrency(disputedAmount),
        helper: "Rows that need follow-up with the partner institution.",
      },
    ],
    institutions: institutionRows,
    payouts,
  } satisfies RevenueSnapshot;
}

export async function getRevenueSnapshot(): Promise<RevenueSnapshot> {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const [localContext, runtimeConversions, runtimeLedgers] = await Promise.all([
      getLocalActiveContext(),
      readRuntimeConversions(),
      readRuntimeCommissionLedgers(),
    ]);

    return buildRevenueSnapshot({
      branchRows: localContext.branches.length > 0 ? localContext.branches : branches,
      commissionRows: mergeRowsById([...fixtureCommissionLedgers, ...runtimeLedgers]),
      conversionRows: mergeRowsById([...fixtureConversions, ...runtimeConversions]),
      dataSource: localContext.data_source,
      institutionRows: institutions,
      sourceLabel: localContext.source_label,
    });
  }

  const [{ data: branchRows }, { data: institutionRows }, { data: conversionRows }, { data: commissionRows }] = await Promise.all([
    supabase.from("branches").select("*").eq("active", true),
    supabase.from("institutions").select("*").eq("active", true),
    supabase.from("conversions").select("*"),
    supabase.from("commission_ledgers").select("*"),
  ]);

  return buildRevenueSnapshot({
    branchRows: (branchRows ?? []) as Branch[],
    commissionRows: (commissionRows ?? []) as CommissionLedger[],
    conversionRows: (conversionRows ?? []) as Conversion[],
    dataSource: "supabase",
    institutionRows: (institutionRows ?? []) as Institution[],
    sourceLabel: "Supabase",
  });
}
