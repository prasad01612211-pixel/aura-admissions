import "server-only";

import {
  getLeadSourceChannel,
  getLeadSourceKey,
  isActiveLead,
  isLeadAtRisk,
  isOpenTask,
  isOverdueTask,
  isWonLead,
} from "@/lib/data/conversion-engine-core";
import { conversations as fixtureConversations } from "@/lib/fixtures/demo-data";
import { getLocalActiveContext } from "@/lib/data/local-state";
import { readRuntimeConversations } from "@/lib/runtime/store";
import { isHotLead } from "@/lib/scoring/score-band";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  Conversation,
  ConversionEngineSnapshot,
  CounselorPerformanceRow,
  Lead,
  SourcePerformanceRow,
  Task,
  User,
} from "@/types/domain";

const qualifiedStages = new Set([
  "qualified",
  "branch_shown",
  "branch_viewed",
  "callback_requested",
  "visit_requested",
  "form_started",
  "form_submitted",
  "payment_pending",
  "seat_locked",
  "admission_in_progress",
  "admission_confirmed",
]);

const operatorRoles = new Set(["admin", "counselor", "operations"]);

function toRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(1));
}

function toAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

function toMedian(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return sorted[middle];
}

function buildFirstOutboundLookup(conversationRows: Conversation[]) {
  const lookup = new Map<string, string>();

  conversationRows
    .filter((row) => row.direction === "outbound")
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .forEach((row) => {
      if (!lookup.has(row.lead_id)) {
        lookup.set(row.lead_id, row.created_at);
      }
    });

  return lookup;
}

function buildSlaSnapshot(args: {
  conversationRows: Conversation[];
  leadRows: Lead[];
  taskRows: Task[];
}): ConversionEngineSnapshot["sla"] {
  const now = new Date();
  const activeLeadRows = args.leadRows.filter(isActiveLead);
  const firstOutboundLookup = buildFirstOutboundLookup(args.conversationRows);
  const outreachLatencies = activeLeadRows
    .map((lead) => {
      const firstOutboundAt = firstOutboundLookup.get(lead.id);

      if (!firstOutboundAt) {
        return null;
      }

      const createdAt = new Date(lead.created_at);
      const outboundAt = new Date(firstOutboundAt);

      if (Number.isNaN(createdAt.getTime()) || Number.isNaN(outboundAt.getTime())) {
        return null;
      }

      return Math.max(0, Math.round((outboundAt.getTime() - createdAt.getTime()) / (60 * 1000)));
    })
    .filter((value): value is number => value !== null);

  const atRiskLeads = activeLeadRows.filter((lead) => isLeadAtRisk(lead, now));
  const openTasks = args.taskRows.filter(isOpenTask);

  return {
    at_risk_leads: atRiskLeads.length,
    overdue_callbacks: openTasks.filter((task) => task.task_type === "callback" && isOverdueTask(task, now)).length,
    payment_recovery_queue: openTasks.filter((task) => task.task_type === "payment_followup").length,
    unowned_hot_leads: activeLeadRows.filter((lead) => isHotLead(lead) && !lead.owner_user_id).length,
    outreach_coverage_rate: toRate(activeLeadRows.filter((lead) => firstOutboundLookup.has(lead.id)).length, activeLeadRows.length),
    median_initial_outreach_minutes: toMedian(outreachLatencies),
  };
}

function buildCounselorRows(args: {
  leadRows: Lead[];
  taskRows: Task[];
  userRows: User[];
}): CounselorPerformanceRow[] {
  const now = new Date();

  return args.userRows
    .filter((user) => user.active && operatorRoles.has(user.role))
    .map((user) => {
      const ownedLeads = args.leadRows.filter((lead) => lead.owner_user_id === user.id);
      const assignedTasks = args.taskRows.filter((task) => task.assigned_to === user.id && isOpenTask(task));
      const hotOwnedLeads = ownedLeads.filter((lead) => isHotLead(lead));
      const wonLeads = ownedLeads.filter(isWonLead);

      return {
        user_id: user.id,
        name: user.name,
        role: user.role,
        owned_leads: ownedLeads.length,
        hot_leads: hotOwnedLeads.length,
        open_tasks: assignedTasks.length,
        overdue_tasks: assignedTasks.filter((task) => isOverdueTask(task, now)).length,
        callback_tasks: assignedTasks.filter((task) => task.task_type === "callback").length,
        payment_followups: assignedTasks.filter((task) => task.task_type === "payment_followup").length,
        stale_leads: ownedLeads.filter((lead) => isLeadAtRisk(lead, now)).length,
        won_leads: wonLeads.length,
        close_rate: toRate(wonLeads.length, ownedLeads.length),
      };
    })
    .sort(
      (left, right) =>
        right.won_leads - left.won_leads ||
        right.hot_leads - left.hot_leads ||
        left.stale_leads - right.stale_leads,
    );
}

function buildSourceRows(leadRows: Lead[]): SourcePerformanceRow[] {
  const grouped = new Map<string, Lead[]>();

  leadRows.forEach((lead) => {
    const sourceKey = getLeadSourceKey(lead);
    const current = grouped.get(sourceKey) ?? [];
    current.push(lead);
    grouped.set(sourceKey, current);
  });

  return [...grouped.entries()]
    .map(([sourceKey, scopedLeads]) => {
      const wonLeads = scopedLeads.filter(isWonLead).length;

      return {
        source_key: sourceKey,
        source_channel: getLeadSourceChannel(scopedLeads[0] as Lead),
        total_leads: scopedLeads.length,
        qualified_leads: scopedLeads.filter((lead) => qualifiedStages.has(lead.stage)).length,
        hot_leads: scopedLeads.filter((lead) => isHotLead(lead)).length,
        payment_pending: scopedLeads.filter((lead) => lead.stage === "payment_pending").length,
        seat_locked: scopedLeads.filter((lead) => lead.seat_lock_paid || lead.stage === "seat_locked").length,
        won_leads: wonLeads,
        avg_lead_score: toAverage(scopedLeads.map((lead) => lead.lead_score)),
        conversion_rate: toRate(wonLeads, scopedLeads.length),
      } satisfies SourcePerformanceRow;
    })
    .sort((left, right) => right.won_leads - left.won_leads || right.total_leads - left.total_leads)
    .slice(0, 8);
}

function buildSnapshot(args: {
  conversationRows: Conversation[];
  dataSource: ConversionEngineSnapshot["data_source"];
  leadRows: Lead[];
  sourceLabel: string;
  taskRows: Task[];
  userRows: User[];
}): ConversionEngineSnapshot {
  return {
    data_source: args.dataSource,
    source_label: args.sourceLabel,
    sla: buildSlaSnapshot({
      conversationRows: args.conversationRows,
      leadRows: args.leadRows,
      taskRows: args.taskRows,
    }),
    counselor_rows: buildCounselorRows({
      leadRows: args.leadRows,
      taskRows: args.taskRows,
      userRows: args.userRows,
    }),
    source_rows: buildSourceRows(args.leadRows.filter(isActiveLead)),
  };
}

export async function getConversionEngineSnapshot(): Promise<ConversionEngineSnapshot> {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const localContext = await getLocalActiveContext();
    const runtimeConversations = await readRuntimeConversations();
    const conversationRows =
      localContext.data_source === "fixtures"
        ? [...fixtureConversations, ...runtimeConversations.filter((row) => localContext.leads.some((lead) => lead.id === row.lead_id))]
        : runtimeConversations.filter((row) => localContext.leads.some((lead) => lead.id === row.lead_id));

    return buildSnapshot({
      conversationRows,
      dataSource: localContext.data_source,
      leadRows: localContext.leads,
      sourceLabel: localContext.source_label,
      taskRows: localContext.tasks,
      userRows: localContext.users,
    });
  }

  const [{ data: conversationRows }, { data: leadRows }, { data: taskRows }, { data: userRows }] = await Promise.all([
    supabase.from("conversations").select("*"),
    supabase.from("leads").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("users").select("*"),
  ]);

  return buildSnapshot({
    conversationRows: (conversationRows ?? []) as Conversation[],
    dataSource: "supabase",
    leadRows: (leadRows ?? []) as Lead[],
    sourceLabel: "Supabase",
    taskRows: (taskRows ?? []) as Task[],
    userRows: (userRows ?? []) as User[],
  });
}
