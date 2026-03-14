import "server-only";

import { branches, campaigns, leadEvents, leads, payments, tasks } from "@/lib/fixtures/demo-data";
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

const admissionIncentive = 15000;
const priorityMap = { low: 1, medium: 2, high: 3, urgent: 4 } as const;

function buildDashboardSnapshot(args: {
  branchRows: Branch[];
  campaignRows: Campaign[];
  leadEventRows: LeadEvent[];
  leadRows: Lead[];
  paymentRows: Payment[];
  taskRows: Task[];
}): DashboardSnapshot {
  const { branchRows, campaignRows, leadEventRows, leadRows, paymentRows, taskRows } = args;
  const hotLeads = leadRows.filter((lead) => isHotLead(lead)).sort((left, right) => right.lead_score - left.lead_score).slice(0, 6);
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
  const stageCounts = stageOrder.map((stage) => ({ stage, count: leadRows.filter((lead) => lead.stage === stage).length }));
  const seatLockedCount = paymentRows.filter((payment) => payment.status === "paid").length;
  const paymentPendingCount = paymentRows.filter((payment) => payment.status === "pending").length;
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

  return {
    metrics: [
      { label: "Active pilot leads", value: String(leadRows.length), helper: "Foundation includes 20 seeded leads and a 10,000-lead pilot posture.", tone: "neutral" },
      { label: "Hot + priority leads", value: String(leadRows.filter((lead) => lead.lead_score >= 50).length), helper: "Immediate human-handled queue for callbacks, visits, and payments.", tone: "positive" },
      { label: "Payment pending", value: String(paymentPendingCount), helper: "Parents who reached payment intent but still need a push.", tone: paymentPendingCount > 0 ? "attention" : "neutral" },
      { label: "Revenue at seat lock", value: formatCurrency(seatLockedCount * admissionIncentive), helper: "Successful admissions are worth ₹15,000 each in the current model.", tone: "positive" },
    ],
    stage_counts: stageCounts,
    recent_events: [...leadEventRows].sort((left, right) => right.created_at.localeCompare(left.created_at)).slice(0, 8).map((event) => ({
      id: event.id,
      lead_id: event.lead_id,
      lead_name: leadNameLookup.get(event.lead_id) ?? "Unknown lead",
      event_type: event.event_type,
      created_at: event.created_at,
    })),
    hot_leads: hotLeads,
    task_queue: openTasks,
    campaigns: [...campaignRows].sort((left, right) => right.created_at.localeCompare(left.created_at)),
    branch_performance: branchPerformance,
  };
}

export async function getDashboardSnapshot() {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    return buildDashboardSnapshot({
      branchRows: branches,
      campaignRows: campaigns,
      leadEventRows: leadEvents,
      leadRows: leads,
      paymentRows: payments,
      taskRows: tasks,
    });
  }

  const [
    { data: branchRows, error: branchError },
    { data: campaignRows, error: campaignError },
    { data: leadEventRows, error: leadEventError },
    { data: leadRows, error: leadError },
    { data: paymentRows, error: paymentError },
    { data: taskRows, error: taskError },
  ] = await Promise.all([
    supabase.from("branches").select("*").eq("active", true),
    supabase.from("campaigns").select("*"),
    supabase.from("lead_events").select("*"),
    supabase.from("leads").select("*"),
    supabase.from("payments").select("*"),
    supabase.from("tasks").select("*"),
  ]);

  if (
    branchError ||
    campaignError ||
    leadEventError ||
    leadError ||
    paymentError ||
    taskError ||
    !branchRows ||
    !campaignRows ||
    !leadEventRows ||
    !leadRows ||
    !paymentRows ||
    !taskRows
  ) {
    return buildDashboardSnapshot({
      branchRows: branches,
      campaignRows: campaigns,
      leadEventRows: leadEvents,
      leadRows: leads,
      paymentRows: payments,
      taskRows: tasks,
    });
  }

  return buildDashboardSnapshot({
    branchRows,
    campaignRows,
    leadEventRows,
    leadRows,
    paymentRows,
    taskRows,
  });
}
