import "server-only";

import { admissionAttributions, branches, commissionRules, payments } from "@/lib/fixtures/demo-data";
import {
  commissionLedgers as fixtureCommissionLedgers,
  conversions as fixtureConversions,
  objectionLogs as fixtureObjectionLogs,
  recommendations as fixtureRecommendations,
  visitBookings as fixtureVisitBookings,
} from "@/lib/fixtures/operations-data";
import { getLeadWorkflowSnapshot } from "@/lib/admission/service";
import { getLeadIntentSummary } from "@/lib/operations/intent";
import { getPayoutReadiness } from "@/lib/operations/commission";
import {
  readRuntimeCommissionLedgers,
  readRuntimeConversions,
  readRuntimeObjectionLogs,
  readRuntimeRecommendations,
  readRuntimeVisitBookings,
} from "@/lib/runtime/ops-store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Branch, CommissionRule, Payment } from "@/types/domain";
import type { CommissionLedger, Conversion, LeadOperationsSnapshot, ObjectionLog, Recommendation, VisitBooking } from "@/types/operations";

function mergeById<T extends { id: string }>(rows: T[]) {
  const map = new Map<string, T>();
  rows.forEach((row) => map.set(row.id, row));
  return [...map.values()];
}

export async function getLeadOperationsSnapshot(leadId: string): Promise<LeadOperationsSnapshot | null> {
  const workflow = await getLeadWorkflowSnapshot(leadId);
  if (!workflow) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  let objections: ObjectionLog[] = [];
  let visits: VisitBooking[] = [];
  let recommendations: Recommendation[] = [];
  let conversions: Conversion[] = [];
  let commissionLedgers: CommissionLedger[] = [];

  if (supabase) {
    const [{ data: objectionRows }, { data: visitRows }, { data: recommendationRows }, { data: conversionRows }, { data: ledgerRows }] =
      await Promise.all([
        supabase.from("objection_logs").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
        supabase.from("visit_bookings").select("*").eq("lead_id", leadId).order("scheduled_for", { ascending: false }),
        supabase.from("recommendations").select("*").eq("lead_id", leadId).order("rank_position"),
        supabase.from("conversions").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
        supabase.from("commission_ledgers").select("*").order("created_at", { ascending: false }),
      ]);

    objections = (objectionRows ?? []) as ObjectionLog[];
    visits = (visitRows ?? []) as VisitBooking[];
    recommendations = (recommendationRows ?? []) as Recommendation[];
    conversions = (conversionRows ?? []) as Conversion[];
    commissionLedgers = ((ledgerRows ?? []) as CommissionLedger[]).filter((ledger) =>
      conversions.some((conversion) => conversion.id === ledger.conversion_id),
    );
  } else {
    objections = mergeById([...fixtureObjectionLogs, ...(await readRuntimeObjectionLogs())]).filter((row) => row.lead_id === leadId);
    visits = mergeById([...fixtureVisitBookings, ...(await readRuntimeVisitBookings())]).filter((row) => row.lead_id === leadId);
    recommendations = mergeById([...fixtureRecommendations, ...(await readRuntimeRecommendations())]).filter((row) => row.lead_id === leadId);
    conversions = mergeById([...fixtureConversions, ...(await readRuntimeConversions())]).filter((row) => row.lead_id === leadId);
    commissionLedgers = mergeById([...fixtureCommissionLedgers, ...(await readRuntimeCommissionLedgers())]).filter((ledger) =>
      conversions.some((conversion) => conversion.id === ledger.conversion_id),
    );
  }

  const branchMap = new Map<string, Branch>(branches.map((branch) => [branch.id, branch]));
  const branch =
    branchMap.get(workflow.lead.assigned_branch_id ?? "") ??
    branchMap.get(workflow.lead.preferred_branch_id ?? "") ??
    null;
  const conversion = conversions[0] ?? null;
  const commission = commissionLedgers[0] ?? null;
  const attribution = admissionAttributions.find((row) => row.lead_id === leadId) ?? null;
  const rule =
    commissionRules.find((candidate) => candidate.branch_id && candidate.branch_id === branch?.id) ??
    commissionRules.find((candidate) => attribution && candidate.institution_id === attribution.institution_id) ??
    null;
  const payment =
    workflow.payments.find((row) => row.status === "paid") ??
    payments.find((row) => row.lead_id === leadId && row.status === "paid") ??
    null;
  const intent = getLeadIntentSummary({
    lead: workflow.lead,
    events: workflow.events,
    payments: workflow.payments,
    objections,
  });

  const payoutReadiness = getPayoutReadiness({
    lead: workflow.lead,
    branch,
    payment: payment as Payment | null,
    conversion,
    rule: rule as CommissionRule | null,
  });

  return {
    lead: {
      ...workflow.lead,
      intent_score: intent.score,
    },
    events: [
      ...workflow.events,
      ...payoutReadiness.map((check, index) => ({
        id: `payout-readiness-${index}`,
        lead_id: workflow.lead.id,
        event_type: check.ready ? "payout_check_ready" : "payout_check_blocked",
        event_source: "commission_engine",
        payload: { key: check.key, label: check.label },
        created_at: new Date().toISOString(),
      })),
    ],
    objections,
    visits,
    recommendations,
    intent,
    conversion,
    commission,
  };
}
