import { isHotLead } from "@/lib/scoring/score-band";
import type { Lead, Task } from "@/types/domain";

const wonStages = new Set(["seat_locked", "admission_in_progress", "admission_confirmed"]);
const openTaskStatuses = new Set(["open", "in_progress"]);

export function isActiveLead(lead: Lead) {
  return !["lost", "invalid", "duplicate"].includes(lead.status);
}

export function isWonLead(lead: Lead) {
  return lead.status === "won" || wonStages.has(lead.stage);
}

export function getHumanSlaHours(lead: Lead) {
  switch (lead.stage) {
    case "callback_requested":
      return 2;
    case "payment_pending":
      return 2;
    case "visit_requested":
      return 4;
    case "form_submitted":
      return 4;
    case "branch_viewed":
    case "branch_shown":
      return isHotLead(lead) ? 6 : null;
    case "qualified":
    case "form_started":
      return isHotLead(lead) ? 8 : null;
    default:
      return null;
  }
}

export function getLastHumanAttentionTimestamp(lead: Lead) {
  return lead.last_human_contact_at ?? lead.last_incoming_at ?? lead.created_at;
}

export function isLeadAtRisk(lead: Lead, now = new Date()) {
  const slaHours = getHumanSlaHours(lead);

  if (!slaHours || !isActiveLead(lead) || isWonLead(lead)) {
    return false;
  }

  const lastAttentionAt = new Date(getLastHumanAttentionTimestamp(lead));

  if (Number.isNaN(lastAttentionAt.getTime())) {
    return false;
  }

  return now.getTime() - lastAttentionAt.getTime() > slaHours * 60 * 60 * 1000;
}

export function isOpenTask(task: Task) {
  return openTaskStatuses.has(task.status);
}

export function isOverdueTask(task: Task, now = new Date()) {
  if (!isOpenTask(task) || !task.due_at) {
    return false;
  }

  const dueAt = new Date(task.due_at);

  if (Number.isNaN(dueAt.getTime())) {
    return false;
  }

  return dueAt.getTime() < now.getTime();
}

export function getLeadSourceKey(lead: Lead) {
  return lead.utm_campaign ?? lead.source_campaign ?? lead.utm_source ?? lead.source ?? "manual";
}

export function getLeadSourceChannel(lead: Lead) {
  return lead.source_medium ?? lead.utm_source ?? lead.source ?? "manual";
}
