import type { Lead, LeadEvent, Payment } from "@/types/domain";
import type { LeadIntentLabel, LeadIntentScoreEvent, LeadIntentSummary, ObjectionLog } from "@/types/operations";

export const defaultIntentThresholds = {
  warm: 8,
  hot: 18,
  payment_ready: 30,
} as const;

export const defaultIntentRules = [
  { key: "replied_to_first_message", label: "Replied to first message", points: 5 },
  { key: "shared_student_name", label: "Shared student name", points: 3 },
  { key: "shared_location", label: "Shared district or area", points: 2 },
  { key: "selected_course", label: "Selected course", points: 3 },
  { key: "asked_fee_question", label: "Asked fee question", points: 6 },
  { key: "asked_hostel_question", label: "Asked hostel question", points: 5 },
  { key: "asked_admission_process", label: "Asked admission process", points: 7 },
  { key: "clicked_branch_page", label: "Viewed branch page", points: 4 },
  { key: "submitted_form", label: "Submitted form", points: 12 },
  { key: "started_payment", label: "Started payment", points: 10 },
  { key: "completed_payment", label: "Completed payment", points: 20 },
  { key: "explicit_rejection", label: "Explicit rejection", points: -20 },
  { key: "high_severity_objection", label: "High severity objection", points: -5 },
  { key: "no_response_decay", label: "No recent response", points: -4 },
] as const;

function hasEvent(eventRows: Pick<LeadEvent, "event_type">[], eventType: string) {
  return eventRows.some((event) => event.event_type === eventType);
}

function deriveIntentLabel(score: number, thresholds = defaultIntentThresholds): LeadIntentLabel {
  if (score >= thresholds.payment_ready) return "payment_ready";
  if (score >= thresholds.hot) return "hot";
  if (score >= thresholds.warm) return "warm";
  return "cold";
}

export function getLeadIntentSummary(args: {
  lead: Lead;
  events?: Pick<LeadEvent, "event_type" | "created_at">[];
  payments?: Pick<Payment, "status">[];
  objections?: Pick<ObjectionLog, "objection_type" | "severity" | "created_at">[];
  now?: Date;
  thresholds?: Partial<typeof defaultIntentThresholds>;
}): LeadIntentSummary {
  const events = args.events ?? [];
  const payments = args.payments ?? [];
  const objections = args.objections ?? [];
  const now = args.now ?? new Date();
  const thresholds = { ...defaultIntentThresholds, ...(args.thresholds ?? {}) };

  const responseAgeHours = args.lead.last_incoming_at
    ? Math.round((now.getTime() - new Date(args.lead.last_incoming_at).getTime()) / (1000 * 60 * 60))
    : null;

  const factors: LeadIntentScoreEvent[] = [
    {
      key: "replied_to_first_message",
      label: "Replied to first message",
      points: 5,
      applied: hasEvent(events, "parent_replied"),
      reason: "Inbound reply detected on WhatsApp.",
    },
    {
      key: "shared_student_name",
      label: "Shared student name",
      points: 3,
      applied: Boolean(args.lead.student_name),
      reason: "Student identity captured.",
    },
    {
      key: "shared_location",
      label: "Shared district or area",
      points: 2,
      applied: Boolean(args.lead.area || args.lead.city || args.lead.district),
      reason: "Usable location data captured.",
    },
    {
      key: "selected_course",
      label: "Selected course",
      points: 3,
      applied: Boolean(args.lead.course_interest),
      reason: "Course intent is known.",
    },
    {
      key: "asked_fee_question",
      label: "Asked fee question",
      points: 6,
      applied: hasEvent(events, "faq_fee_detected"),
      reason: "Fee question usually indicates serious parent consideration.",
    },
    {
      key: "asked_hostel_question",
      label: "Asked hostel question",
      points: 5,
      applied: hasEvent(events, "faq_hostel_detected"),
      reason: "Hostel questions indicate shortlist behavior.",
    },
    {
      key: "asked_admission_process",
      label: "Asked admission process",
      points: 7,
      applied: hasEvent(events, "faq_admission_process_detected"),
      reason: "Parent is moving beyond discovery into process.",
    },
    {
      key: "clicked_branch_page",
      label: "Viewed branch page",
      points: 4,
      applied: hasEvent(events, "branch_viewed"),
      reason: "Parent engaged with a trust page.",
    },
    {
      key: "submitted_form",
      label: "Submitted form",
      points: 12,
      applied: hasEvent(events, "form_submitted"),
      reason: "High admission intent.",
    },
    {
      key: "started_payment",
      label: "Started payment",
      points: 10,
      applied: hasEvent(events, "payment_page_opened") || payments.some((payment) => payment.status === "pending"),
      reason: "Parent reached payment intent.",
    },
    {
      key: "completed_payment",
      label: "Completed payment",
      points: 20,
      applied: payments.some((payment) => payment.status === "paid") || hasEvent(events, "seat_lock_paid"),
      reason: "Seat-lock completed.",
    },
    {
      key: "explicit_rejection",
      label: "Explicit rejection",
      points: -20,
      applied: args.lead.status === "lost" || hasEvent(events, "lead_lost"),
      reason: "Lead explicitly rejected or marked lost.",
    },
    {
      key: "high_severity_objection",
      label: "High severity objection",
      points: -5,
      applied: objections.some((objection) => objection.severity === "high"),
      reason: "Unresolved objection can slow conversion.",
    },
    {
      key: "no_response_decay",
      label: "No recent response",
      points: -4,
      applied: responseAgeHours !== null && responseAgeHours >= 48,
      reason: "No inbound response in the last 48 hours.",
    },
  ];

  const score = factors.reduce((sum, factor) => sum + (factor.applied ? factor.points : 0), 0);

  return {
    score,
    label: deriveIntentLabel(score, thresholds),
    threshold_source: "default",
    events: factors,
  };
}
