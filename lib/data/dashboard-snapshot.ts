import "server-only";

import { campaigns } from "@/lib/fixtures/demo-data";
import {
  commissionLedgers as fixtureCommissionLedgers,
  conversions as fixtureConversions,
  visitBookings as fixtureVisitBookings,
} from "@/lib/fixtures/operations-data";
import { getLocalFixtureContext, getLocalImportContext } from "@/lib/data/local-state";
import {
  readRuntimeCommissionLedgers,
  readRuntimeConversions,
  readRuntimeVisitBookings,
} from "@/lib/runtime/ops-store";
import { getConversionEngineSnapshot } from "@/lib/data/conversion-engine";
import { isHotLead } from "@/lib/scoring/score-band";
import { stageOrder } from "@/lib/state-machine/constants";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatCurrency, getLeadDisplayName } from "@/lib/utils";
import type {
  Branch,
  Campaign,
  DashboardBranchPerformance,
  DashboardSnapshot,
  Lead,
  LeadEvent,
  Payment,
  Task,
} from "@/types/domain";
import type { CommissionLedger, Conversion, VisitBooking } from "@/types/operations";

const priorityMap = { low: 1, medium: 2, high: 3, urgent: 4 } as const;

function mergeById<T extends { id: string }>(rows: T[]) {
  const merged = new Map<string, T>();
  rows.forEach((row) => merged.set(row.id, row));
  return [...merged.values()];
}

function buildStageCounts(args: {
  dataSource: "fixtures" | "local_import" | "supabase";
  leadRows: Lead[];
  totalLeadCount: number;
}) {
  const { dataSource, leadRows, totalLeadCount } = args;

  if (dataSource !== "local_import") {
    return stageOrder.map((stage) => ({
      stage,
      count: leadRows.filter((lead) => lead.stage === stage).length,
    }));
  }

  const runtimeStageCounts = new Map(stageOrder.map((stage) => [stage, 0]));
  let movedOutOfImported = 0;

  leadRows.forEach((lead) => {
    runtimeStageCounts.set(lead.stage, (runtimeStageCounts.get(lead.stage) ?? 0) + 1);
    if (lead.stage !== "imported") {
      movedOutOfImported += 1;
    }
  });

  runtimeStageCounts.set("imported", Math.max(0, totalLeadCount - movedOutOfImported));

  return stageOrder.map((stage) => ({
    stage,
    count: runtimeStageCounts.get(stage) ?? 0,
  }));
}

function buildDashboardSnapshot(args: {
  branchRows: Branch[];
  campaignRows: Campaign[];
  commissionRows: CommissionLedger[];
  conversionRows: Conversion[];
  dataSource: "fixtures" | "local_import" | "supabase";
  leadEventRows: LeadEvent[];
  leadRows: Lead[];
  paymentRows: Payment[];
  sourceLabel: string;
  taskRows: Task[];
  totalLeadCount: number;
  visitRows: VisitBooking[];
}): DashboardSnapshot {
  const {
    branchRows,
    campaignRows,
    commissionRows,
    conversionRows,
    dataSource,
    leadEventRows,
    leadRows,
    paymentRows,
    sourceLabel,
    taskRows,
    totalLeadCount,
    visitRows,
  } = args;

  const hotLeads = leadRows
    .filter((lead) => isHotLead(lead))
    .sort((left, right) => right.lead_score - left.lead_score)
    .slice(0, 6);
  const openTasks = taskRows
    .filter((task) => task.status !== "completed" && task.status !== "cancelled")
    .sort((left, right) => {
      const priorityDelta = priorityMap[right.priority] - priorityMap[left.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      return (left.due_at ?? left.created_at).localeCompare(right.due_at ?? right.created_at);
    })
    .slice(0, 6);
  const stageCounts = buildStageCounts({
    dataSource,
    leadRows,
    totalLeadCount,
  });
  const seatLockedCount = paymentRows.filter((payment) => payment.status === "paid").length;
  const paymentPendingCount = paymentRows.filter((payment) => payment.status === "pending").length;
  const visitBookedCount = visitRows.length;
  const visitAttendedCount = visitRows.filter((visit) => visit.outcome_status === "attended" || visit.outcome_status === "converted").length;
  const expectedRevenue = commissionRows.reduce((sum, row) => sum + row.expected_amount, 0);
  const readyRevenue = commissionRows
    .filter((row) => row.payout_status === "ready" || row.payout_status === "invoiced")
    .reduce((sum, row) => sum + row.expected_amount, 0);
  const receivedRevenue = commissionRows
    .filter((row) => row.payout_status === "received")
    .reduce((sum, row) => sum + row.expected_amount, 0);

  const branchPerformance: DashboardBranchPerformance[] = branchRows.map((branch) => {
    const linkedLeads = leadRows.filter((lead) => lead.assigned_branch_id === branch.id || lead.preferred_branch_id === branch.id);

    return {
      branch_id: branch.id,
      name: branch.name,
      district: branch.district,
      hot_leads: linkedLeads.filter((lead) => isHotLead(lead)).length,
      seat_locked: linkedLeads.filter((lead) => lead.seat_lock_paid).length,
      capacity_available: branch.capacity_available,
    };
  });

  const leadNameLookup = new Map(leadRows.map((lead) => [lead.id, getLeadDisplayName(lead.student_name, lead.parent_name)]));
  const activeLeadHelper =
    dataSource === "local_import"
      ? `Showing the active local import source: ${sourceLabel}.`
      : "Working against the seeded pilot dataset until Supabase is connected.";

  return {
    metrics: [
      { label: "Active pilot leads", value: totalLeadCount.toLocaleString(), helper: activeLeadHelper, tone: "neutral" },
      {
        label: "Hot + priority leads",
        value: String(leadRows.filter((lead) => lead.lead_score >= 50 || (lead.intent_score ?? 0) >= 18).length),
        helper: "Immediate human-handled queue for callbacks, visits, and payments.",
        tone: "positive",
      },
      {
        label: "Visits booked",
        value: visitBookedCount.toLocaleString(),
        helper: `${visitAttendedCount.toLocaleString()} visits already attended or converted.`,
        tone: visitBookedCount > 0 ? "positive" : "neutral",
      },
      {
        label: "Payment pending",
        value: String(paymentPendingCount),
        helper: "Parents who reached payment intent but still need a push.",
        tone: paymentPendingCount > 0 ? "attention" : "neutral",
      },
      {
        label: "Expected commission",
        value: formatCurrency(expectedRevenue),
        helper: `${conversionRows.length.toLocaleString()} conversion rows currently tracked.`,
        tone: expectedRevenue > 0 ? "positive" : "neutral",
      },
      {
        label: "Ready for payout",
        value: formatCurrency(readyRevenue),
        helper: `${formatCurrency(receivedRevenue)} already recorded as received.`,
        tone: readyRevenue > 0 ? "attention" : "neutral",
      },
      {
        label: "Seat locks paid",
        value: seatLockedCount.toLocaleString(),
        helper: "Parents who already completed the payment step.",
        tone: seatLockedCount > 0 ? "positive" : "neutral",
      },
    ],
    stage_counts: stageCounts,
    recent_events: [...leadEventRows]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 8)
      .map((event) => ({
        id: event.id,
        lead_id: event.lead_id,
        lead_name: leadNameLookup.get(event.lead_id) ?? "Unknown lead",
        event_type: event.event_type,
        created_at: event.created_at,
      })),
    hot_leads: hotLeads,
    task_queue: openTasks,
    campaigns: [...campaignRows].sort((left, right) => right.created_at.localeCompare(left.created_at)),
    branch_performance: branchPerformance.sort((left, right) => right.hot_leads - left.hot_leads || right.seat_locked - left.seat_locked),
    conversion_engine: {
      data_source: dataSource,
      source_label: sourceLabel,
      sla: {
        at_risk_leads: 0,
        overdue_callbacks: 0,
        payment_recovery_queue: 0,
        unowned_hot_leads: 0,
        outreach_coverage_rate: 0,
        median_initial_outreach_minutes: null,
      },
      counselor_rows: [],
      source_rows: [],
    },
  };
}

function filterCommissionRowsByLeadScope(args: {
  leadIds: Set<string>;
  conversionRows: Conversion[];
  commissionRows: CommissionLedger[];
}) {
  const conversionIds = new Set(args.conversionRows.filter((row) => args.leadIds.has(row.lead_id)).map((row) => row.id));
  return args.commissionRows.filter((row) => conversionIds.has(row.conversion_id));
}

export async function getDashboardSnapshot() {
  const conversionEngine = await getConversionEngineSnapshot();
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const localImport = await getLocalImportContext();
    const [runtimeCommissionRows, runtimeConversionRows, runtimeVisitRows] = await Promise.all([
      readRuntimeCommissionLedgers(),
      readRuntimeConversions(),
      readRuntimeVisitBookings(),
    ]);

    if (localImport) {
      const leadIds = new Set(localImport.leads.map((lead) => lead.id));
      const conversionRows = runtimeConversionRows.filter((row) => leadIds.has(row.lead_id));

      return buildDashboardSnapshot({
        branchRows: localImport.branches,
        campaignRows: localImport.campaigns,
        commissionRows: filterCommissionRowsByLeadScope({
          leadIds,
          conversionRows,
          commissionRows: runtimeCommissionRows,
        }),
        conversionRows,
        dataSource: localImport.data_source,
        leadEventRows: localImport.events,
        leadRows: localImport.leads,
        paymentRows: localImport.payments,
        sourceLabel: localImport.source_label,
        taskRows: localImport.tasks,
        totalLeadCount: localImport.total_leads,
        visitRows: runtimeVisitRows.filter((row) => leadIds.has(row.lead_id)),
      });
    }

    const fixtureContext = await getLocalFixtureContext();
    const leadIds = new Set(fixtureContext.leads.map((lead) => lead.id));
    const conversionRows = mergeById([...fixtureConversions, ...runtimeConversionRows]).filter((row) => leadIds.has(row.lead_id));

    const snapshot = buildDashboardSnapshot({
      branchRows: fixtureContext.branches,
      campaignRows: fixtureContext.campaigns,
      commissionRows: filterCommissionRowsByLeadScope({
        leadIds,
        conversionRows,
        commissionRows: mergeById([...fixtureCommissionLedgers, ...runtimeCommissionRows]),
      }),
      conversionRows,
      dataSource: fixtureContext.data_source,
      leadEventRows: fixtureContext.events,
      leadRows: fixtureContext.leads,
      paymentRows: fixtureContext.payments,
      sourceLabel: fixtureContext.source_label,
      taskRows: fixtureContext.tasks,
      totalLeadCount: fixtureContext.total_leads,
      visitRows: mergeById([...fixtureVisitBookings, ...runtimeVisitRows]).filter((row) => leadIds.has(row.lead_id)),
    });

    return {
      ...snapshot,
      conversion_engine: conversionEngine,
    };
  }

  const [
    { data: branchRows, error: branchError },
    { data: campaignRows, error: campaignError },
    { data: commissionRows, error: commissionError },
    { data: conversionRows, error: conversionError },
    { data: leadEventRows, error: leadEventError },
    { data: leadRows, error: leadError },
    { data: paymentRows, error: paymentError },
    { data: taskRows, error: taskError },
    { data: visitRows, error: visitError },
  ] = await Promise.all([
    supabase.from("branches").select("*").eq("active", true),
    supabase.from("campaigns").select("*"),
    supabase.from("commission_ledgers").select("*"),
    supabase.from("conversions").select("*"),
    supabase.from("lead_events").select("*"),
    supabase.from("leads").select("*"),
    supabase.from("payments").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("visit_bookings").select("*"),
  ]);

  if (
    branchError ||
    campaignError ||
    commissionError ||
    conversionError ||
    leadEventError ||
    leadError ||
    paymentError ||
    taskError ||
    visitError ||
    !branchRows ||
    !campaignRows ||
    !commissionRows ||
    !conversionRows ||
    !leadEventRows ||
    !leadRows ||
    !paymentRows ||
    !taskRows ||
    !visitRows
  ) {
    const fixtureContext = await getLocalFixtureContext();
    const [runtimeCommissionRows, runtimeConversionRows, runtimeVisitRows] = await Promise.all([
      readRuntimeCommissionLedgers(),
      readRuntimeConversions(),
      readRuntimeVisitBookings(),
    ]);
    const leadIds = new Set(fixtureContext.leads.map((lead) => lead.id));
    const conversionRowsForFixture = mergeById([...fixtureConversions, ...runtimeConversionRows]).filter((row) => leadIds.has(row.lead_id));

    const snapshot = buildDashboardSnapshot({
      branchRows: fixtureContext.branches,
      campaignRows: fixtureContext.campaigns,
      commissionRows: filterCommissionRowsByLeadScope({
        leadIds,
        conversionRows: conversionRowsForFixture,
        commissionRows: mergeById([...fixtureCommissionLedgers, ...runtimeCommissionRows]),
      }),
      conversionRows: conversionRowsForFixture,
      dataSource: fixtureContext.data_source,
      leadEventRows: fixtureContext.events,
      leadRows: fixtureContext.leads,
      paymentRows: fixtureContext.payments,
      sourceLabel: fixtureContext.source_label,
      taskRows: fixtureContext.tasks,
      totalLeadCount: fixtureContext.total_leads,
      visitRows: mergeById([...fixtureVisitBookings, ...runtimeVisitRows]).filter((row) => leadIds.has(row.lead_id)),
    });

    return {
      ...snapshot,
      conversion_engine: conversionEngine,
    };
  }

  const snapshot = buildDashboardSnapshot({
    branchRows: branchRows as Branch[],
    campaignRows: (campaignRows as Campaign[]) ?? campaigns,
    commissionRows: (commissionRows as CommissionLedger[]) ?? [],
    conversionRows: (conversionRows as Conversion[]) ?? [],
    dataSource: "supabase",
    leadEventRows: leadEventRows as LeadEvent[],
    leadRows: leadRows as Lead[],
    paymentRows: paymentRows as Payment[],
    sourceLabel: "Supabase",
    taskRows: taskRows as Task[],
    totalLeadCount: (leadRows as Lead[]).length,
    visitRows: (visitRows as VisitBooking[]) ?? [],
  });

  return {
    ...snapshot,
    conversion_engine: conversionEngine,
  };
}
