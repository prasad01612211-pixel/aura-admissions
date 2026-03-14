import { botStates, leadStages, leadStatuses } from "@/types/domain";
import type { BotState, LeadStage, LeadStatus } from "@/types/domain";

export const stageOrder = [...leadStages];
export const statusOrder = [...leadStatuses];
export const botStateOrder = [...botStates];

export const leadStageLabels: Record<LeadStage, string> = {
  imported: "Imported",
  contacted: "Contacted",
  replied: "Replied",
  qualified: "Qualified",
  branch_shown: "Branch shown",
  branch_viewed: "Branch viewed",
  callback_requested: "Callback requested",
  visit_requested: "Visit requested",
  form_started: "Form started",
  form_submitted: "Form submitted",
  payment_pending: "Payment pending",
  seat_locked: "Seat locked",
  admission_in_progress: "Admission in progress",
  admission_confirmed: "Admission confirmed",
  lost: "Lost",
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "New",
  warm: "Warm",
  hot: "Hot",
  followup: "Follow-up",
  won: "Won",
  lost: "Lost",
  invalid: "Invalid",
  duplicate: "Duplicate",
};

export const botStateLabels: Record<BotState, string> = {
  awaiting_student_name: "Awaiting student name",
  awaiting_district: "Awaiting district",
  awaiting_course: "Awaiting course",
  awaiting_hostel: "Awaiting hostel",
  branch_recommendation_sent: "Branch recommendation sent",
  awaiting_branch_action: "Awaiting branch action",
  awaiting_visit_slot: "Awaiting visit slot",
  awaiting_form_completion: "Awaiting form completion",
  awaiting_payment: "Awaiting payment",
};
