import { randomUUID } from "crypto";

import type { BotState, Lead, LeadEvent, LeadStage, LeadStatus } from "@/types/domain";

export type LeadTransitionAction =
  | "branch_viewed"
  | "callback_requested"
  | "form_started"
  | "form_submitted"
  | "payment_link_created"
  | "payment_confirmed"
  | "visit_requested";

type TransitionConfig = {
  allowedFrom: LeadStage[];
  nextStage: LeadStage;
  nextStatus?: LeadStatus;
  nextBotState?: BotState | null;
  eventType: string;
  eventSource: string;
};

const transitionConfig: Record<LeadTransitionAction, TransitionConfig> = {
  branch_viewed: {
    allowedFrom: ["imported", "contacted", "replied", "qualified", "branch_shown", "branch_viewed", "callback_requested", "visit_requested", "form_started", "form_submitted", "payment_pending", "seat_locked", "admission_in_progress", "admission_confirmed"],
    nextStage: "branch_viewed",
    nextStatus: "warm",
    nextBotState: "awaiting_branch_action",
    eventType: "branch_viewed",
    eventSource: "public_page",
  },
  callback_requested: {
    allowedFrom: ["qualified", "branch_shown", "branch_viewed", "callback_requested", "visit_requested"],
    nextStage: "callback_requested",
    nextStatus: "followup",
    nextBotState: "awaiting_branch_action",
    eventType: "callback_requested",
    eventSource: "parent_action",
  },
  form_started: {
    allowedFrom: ["imported", "contacted", "replied", "qualified", "branch_shown", "branch_viewed", "callback_requested", "visit_requested", "form_started"],
    nextStage: "form_started",
    nextStatus: "hot",
    nextBotState: "awaiting_form_completion",
    eventType: "form_started",
    eventSource: "admission_form",
  },
  form_submitted: {
    allowedFrom: ["form_started", "form_submitted", "branch_viewed", "qualified"],
    nextStage: "form_submitted",
    nextStatus: "hot",
    nextBotState: "awaiting_payment",
    eventType: "form_submitted",
    eventSource: "admission_form",
  },
  payment_link_created: {
    allowedFrom: ["form_started", "form_submitted", "payment_pending"],
    nextStage: "payment_pending",
    nextStatus: "followup",
    nextBotState: "awaiting_payment",
    eventType: "payment_link_created",
    eventSource: "payment",
  },
  payment_confirmed: {
    allowedFrom: ["form_submitted", "payment_pending", "seat_locked"],
    nextStage: "seat_locked",
    nextStatus: "won",
    nextBotState: null,
    eventType: "seat_lock_paid",
    eventSource: "payment",
  },
  visit_requested: {
    allowedFrom: ["qualified", "branch_shown", "branch_viewed", "callback_requested", "visit_requested"],
    nextStage: "visit_requested",
    nextStatus: "followup",
    nextBotState: "awaiting_visit_slot",
    eventType: "visit_requested",
    eventSource: "parent_action",
  },
};

function canTransition(currentStage: LeadStage, action: LeadTransitionAction) {
  return transitionConfig[action].allowedFrom.includes(currentStage);
}

export function applyLeadTransition(args: {
  lead: Lead;
  action: LeadTransitionAction;
  payload?: Record<string, unknown>;
  leadPatch?: Partial<Lead>;
}) {
  const { lead, action, payload = {}, leadPatch = {} } = args;
  const config = transitionConfig[action];

  if (!canTransition(lead.stage, action)) {
    throw new Error(`Invalid transition: cannot apply ${action} when lead is in ${lead.stage}.`);
  }

  const updatedAt = new Date().toISOString();
  const nextLead: Lead = {
    ...lead,
    ...leadPatch,
    stage: config.nextStage,
    status: config.nextStatus ?? lead.status,
    bot_state: config.nextBotState === undefined ? lead.bot_state : config.nextBotState,
    updated_at: updatedAt,
  };

  const event: LeadEvent = {
    id: randomUUID(),
    lead_id: lead.id,
    event_type: config.eventType,
    event_source: config.eventSource,
    payload,
    created_at: updatedAt,
  };

  return {
    lead: nextLead,
    event,
  };
}
