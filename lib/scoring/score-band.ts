import type { Lead, LeadEvent, LeadScoreBand, LeadScoreFactor, LeadScoreSummary, LeadStatus, Payment } from "@/types/domain";

export const scoringWeights = {
  replied_to_campaign: 10,
  provided_district: 10,
  selected_course: 10,
  hostel_required: 10,
  viewed_branch_page: 15,
  clicked_counselor: 25,
  requested_visit: 35,
  started_form: 25,
  submitted_form: 40,
  opened_payment_link: 30,
  paid_seat_lock: 100,
  no_response_after_three_reminders: -20,
  invalid_number: -100,
} as const;

const terminalStatuses = new Set<LeadStatus>(["won", "lost", "invalid", "duplicate"]);
const followupStages = new Set(["callback_requested", "visit_requested", "payment_pending"]);
const wonStages = new Set(["seat_locked", "admission_in_progress", "admission_confirmed"]);
const replyEvents = new Set(["parent_replied", "campaign_reply"]);
const callbackEvents = new Set(["callback_requested", "counselor_requested"]);
const reminderFailureEvents = new Set(["three_reminders_without_response", "recovery_exhausted"]);
const invalidEvents = new Set(["invalid_number", "invalid_phone"]);

export function getLeadScoreBand(score: number): LeadScoreBand {
  if (score >= 90) {
    return "priority";
  }

  if (score >= 50) {
    return "hot";
  }

  if (score >= 20) {
    return "warm";
  }

  return "cold";
}

export function isHotLead(lead: Pick<Lead, "lead_score" | "status">) {
  return lead.lead_score >= 50 && !["won", "lost", "invalid", "duplicate"].includes(lead.status);
}

function hasEvent(eventTypes: Set<string>, events: Pick<LeadEvent, "event_type">[]) {
  return events.some((event) => eventTypes.has(event.event_type));
}

export function deriveLeadStatus(args: {
  lead: Pick<Lead, "stage" | "status">;
  score: number;
  hasInvalidSignal?: boolean;
}): LeadStatus {
  const { lead, score, hasInvalidSignal = false } = args;

  if (lead.status === "duplicate") {
    return "duplicate";
  }

  if (lead.status === "invalid" || hasInvalidSignal) {
    return "invalid";
  }

  if (lead.stage === "lost" || lead.status === "lost") {
    return "lost";
  }

  if (lead.status === "won" || wonStages.has(lead.stage)) {
    return "won";
  }

  if (followupStages.has(lead.stage)) {
    return "followup";
  }

  if (score >= 50) {
    return "hot";
  }

  if (score >= 20) {
    return "warm";
  }

  return "new";
}

export function getLeadScoreSummary(args: {
  lead: Pick<Lead, "course_interest" | "district" | "hostel_required" | "stage" | "status">;
  events?: Pick<LeadEvent, "event_type">[];
  payments?: Pick<Payment, "status">[];
}): LeadScoreSummary {
  const events = args.events ?? [];
  const payments = args.payments ?? [];
  const paidSeatLock = payments.some((payment) => payment.status === "paid") || events.some((event) => event.event_type === "seat_lock_paid");
  const hasInvalidSignal = args.lead.status === "invalid" || hasEvent(invalidEvents, events);

  const factors: LeadScoreFactor[] = [
    {
      key: "replied_to_campaign",
      label: "Replied to campaign",
      points: scoringWeights.replied_to_campaign,
      applied: hasEvent(replyEvents, events),
    },
    {
      key: "provided_district",
      label: "Provided district",
      points: scoringWeights.provided_district,
      applied: Boolean(args.lead.district),
    },
    {
      key: "selected_course",
      label: "Selected course",
      points: scoringWeights.selected_course,
      applied: Boolean(args.lead.course_interest),
    },
    {
      key: "hostel_required",
      label: "Hostel required",
      points: scoringWeights.hostel_required,
      applied: args.lead.hostel_required,
    },
    {
      key: "viewed_branch_page",
      label: "Viewed branch page",
      points: scoringWeights.viewed_branch_page,
      applied: events.some((event) => event.event_type === "branch_viewed"),
    },
    {
      key: "clicked_counselor",
      label: "Clicked counselor",
      points: scoringWeights.clicked_counselor,
      applied: hasEvent(callbackEvents, events),
    },
    {
      key: "requested_visit",
      label: "Requested visit",
      points: scoringWeights.requested_visit,
      applied: events.some((event) => event.event_type === "visit_requested"),
    },
    {
      key: "started_form",
      label: "Started form",
      points: scoringWeights.started_form,
      applied: events.some((event) => event.event_type === "form_started"),
    },
    {
      key: "submitted_form",
      label: "Submitted form",
      points: scoringWeights.submitted_form,
      applied: events.some((event) => event.event_type === "form_submitted"),
    },
    {
      key: "opened_payment_link",
      label: "Opened payment link",
      points: scoringWeights.opened_payment_link,
      applied: events.some((event) => event.event_type === "payment_page_opened"),
    },
    {
      key: "paid_seat_lock",
      label: "Paid seat lock",
      points: scoringWeights.paid_seat_lock,
      applied: paidSeatLock,
    },
    {
      key: "no_response_after_three_reminders",
      label: "No response after 3 reminders",
      points: scoringWeights.no_response_after_three_reminders,
      applied: hasEvent(reminderFailureEvents, events),
    },
    {
      key: "invalid_number",
      label: "Invalid number",
      points: scoringWeights.invalid_number,
      applied: hasInvalidSignal,
    },
  ];

  const score = factors.reduce((total, factor) => total + (factor.applied ? factor.points : 0), 0);
  const status = deriveLeadStatus({
    lead: args.lead,
    score,
    hasInvalidSignal,
  });

  return {
    score,
    band: getLeadScoreBand(score),
    status,
    factors,
  };
}

export function applyLeadScoreModel(args: {
  lead: Lead;
  events?: Pick<LeadEvent, "event_type">[];
  payments?: Pick<Payment, "status">[];
}) {
  const summary = getLeadScoreSummary(args);
  const nextStatus = terminalStatuses.has(args.lead.status) && args.lead.status !== "won" && args.lead.status !== "lost"
    ? args.lead.status
    : summary.status;

  return {
    lead: {
      ...args.lead,
      lead_score: summary.score,
      status: nextStatus,
    },
    summary,
  };
}
