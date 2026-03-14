import "server-only";

import { getLocalActiveContext } from "@/lib/data/local-state";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getLeadDisplayName } from "@/lib/utils";
import type {
  Branch,
  Lead,
  Task,
  TaskPriority,
  TaskQueueItem,
  TaskQueueSnapshot,
  TaskStatus,
  User,
} from "@/types/domain";

type TaskQueueFilters = {
  assignedTo?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
};

const priorityWeight = { low: 1, medium: 2, high: 3, urgent: 4 } as const;

function applyTaskFilters(taskRows: Task[], filters: TaskQueueFilters) {
  return taskRows.filter((task) => {
    if (filters.assignedTo && task.assigned_to !== filters.assignedTo) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.status && task.status !== filters.status) return false;
    return true;
  });
}

function buildTaskItems(args: {
  branchRows: Branch[];
  leadRows: Lead[];
  taskRows: Task[];
  userRows: User[];
}) {
  const { branchRows, leadRows, taskRows, userRows } = args;
  const branchLookup = new Map(branchRows.map((branch) => [branch.id, branch.name]));
  const leadLookup = new Map(leadRows.map((lead) => [lead.id, lead]));
  const userLookup = new Map(userRows.map((user) => [user.id, user.name]));

  return taskRows
    .map((task) => {
      const lead = leadLookup.get(task.lead_id);

      if (!lead) {
        return null;
      }

      return {
        ...task,
        assignee_name: task.assigned_to ? userLookup.get(task.assigned_to) ?? null : null,
        branch_name: task.branch_id ? branchLookup.get(task.branch_id) ?? null : null,
        lead_name: getLeadDisplayName(lead.student_name, lead.parent_name),
        lead_score: lead.lead_score,
        lead_stage: lead.stage,
        lead_status: lead.status,
        parent_phone: lead.parent_phone ?? lead.student_phone,
      } satisfies TaskQueueItem;
    })
    .filter((item): item is TaskQueueItem => Boolean(item))
    .sort((left, right) => {
      const priorityDelta = priorityWeight[right.priority] - priorityWeight[left.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return (left.due_at ?? left.created_at).localeCompare(right.due_at ?? right.created_at);
    });
}

function buildTaskQueueSnapshot(args: {
  branchRows: Branch[];
  dataSource: TaskQueueSnapshot["data_source"];
  leadRows: Lead[];
  sourceLabel: string;
  taskRows: Task[];
  userRows: User[];
}): TaskQueueSnapshot {
  const items = buildTaskItems(args);
  const now = Date.now();

  return {
    data_source: args.dataSource,
    source_label: args.sourceLabel,
    items,
    open_count: items.filter((task) => task.status !== "completed" && task.status !== "cancelled").length,
    urgent_count: items.filter((task) => task.priority === "urgent" && task.status !== "completed" && task.status !== "cancelled").length,
    overdue_count: items.filter(
      (task) =>
        Boolean(task.due_at) &&
        new Date(task.due_at as string).getTime() < now &&
        task.status !== "completed" &&
        task.status !== "cancelled",
    ).length,
    users: args.userRows.map((user) => ({ id: user.id, name: user.name })),
  };
}

export async function getTaskQueueSnapshot(filters: TaskQueueFilters = {}) {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const localContext = await getLocalActiveContext();

    return buildTaskQueueSnapshot({
      branchRows: localContext.branches,
      dataSource: localContext.data_source,
      leadRows: localContext.leads,
      sourceLabel: localContext.source_label,
      taskRows: applyTaskFilters(localContext.tasks, filters),
      userRows: localContext.users,
    });
  }

  const [{ data: branchRows }, { data: leadRows }, { data: taskRows }, { data: userRows }] = await Promise.all([
    supabase.from("branches").select("*").eq("active", true),
    supabase.from("leads").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("users").select("*"),
  ]);

  return buildTaskQueueSnapshot({
    branchRows: (branchRows ?? []) as Branch[],
    dataSource: "supabase",
    leadRows: (leadRows ?? []) as Lead[],
    sourceLabel: "Supabase",
    taskRows: applyTaskFilters((taskRows ?? []) as Task[], filters),
    userRows: (userRows ?? []) as User[],
  });
}
