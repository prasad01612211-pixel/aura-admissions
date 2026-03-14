import type { WhatsAppAiContext } from "@/lib/ai/types";

export const whatsappAgentPromptVersion = "wa_agent_v2";

function formatRecentMessages(context: WhatsAppAiContext) {
  if (context.recentMessages.length === 0) {
    return "No recent messages.";
  }

  return context.recentMessages
    .map((message) => {
      const speaker = message.direction === "inbound" ? "Parent" : "Admissions";
      return `${speaker}: ${message.message_body ?? ""}`.trim();
    })
    .join("\n");
}

function formatRecommendations(context: WhatsAppAiContext) {
  if (context.recommendations.length === 0) {
    return "No recommendations available.";
  }

  return context.recommendations
    .slice(0, 3)
    .map((recommendation, index) => {
      return `${index + 1}. ${recommendation.branch_name} (${recommendation.city}) - branch_ref=${recommendation.branch_id} - ${recommendation.reasons.join(", ") || "Good fit"}`;
    })
    .join("\n");
}

function formatPayments(context: WhatsAppAiContext) {
  if (context.payments.length === 0) {
    return "No payment records.";
  }

  return context.payments
    .slice(0, 2)
    .map((payment) => `${payment.status} ${payment.amount} ${payment.currency} for ${payment.purpose}`)
    .join("\n");
}

function formatTasks(context: WhatsAppAiContext) {
  if (context.openTasks.length === 0) {
    return "No open tasks.";
  }

  return context.openTasks
    .slice(0, 3)
    .map((task) => `${task.task_type} (${task.priority}) - ${task.notes ?? "No notes"}`)
    .join("\n");
}

function formatSelectedBranchFacts(context: WhatsAppAiContext) {
  if (!context.selectedBranch) {
    return "No branch selected yet.";
  }

  const branch = context.selectedBranch;
  return [
    `${branch.name} in ${branch.city}, ${branch.district}`,
    `Branch ref: ${branch.id}`,
    `Hostel: ${branch.hostel_available ? "available" : "not available"}`,
    `Transport: ${branch.transport_available ? "available" : "not available"}`,
    branch.address ? `Address: ${branch.address}` : null,
    branch.latest_fee_snapshot?.tuition_fee ? `Latest tuition snapshot: INR ${branch.latest_fee_snapshot.tuition_fee}` : "No verified tuition snapshot available.",
    branch.latest_fee_snapshot?.application_fee ? `Application fee snapshot: INR ${branch.latest_fee_snapshot.application_fee}` : null,
    branch.trust_score ? `Trust score: ${branch.trust_score}/100` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatFormStatus(context: WhatsAppAiContext) {
  if (!context.form) {
    return "No admission form started yet.";
  }

  const pendingDocuments = context.form.documents.filter((document) => document.status !== "received").map((document) => document.label);
  return [
    `Form status: ${context.form.submission_status}`,
    `Course selected: ${context.form.course_selected}`,
    `Hostel required on form: ${context.form.hostel_required ? "yes" : "no"}`,
    pendingDocuments.length > 0 ? `Pending documents: ${pendingDocuments.join(", ")}` : "All listed documents received.",
  ].join("\n");
}

function formatAllowedTools(toolNames: string[]) {
  if (toolNames.length === 0) {
    return "No tools are available. Reply only with information already in context, or escalate.";
  }

  return toolNames.join(", ");
}

export function buildWhatsAppAgentInstructions(args: { context: WhatsAppAiContext; allowedTools: string[] }) {
  const { context, allowedTools } = args;
  return [
    "You are the admissions desk for an AP/Telangana admissions consultancy.",
    "Your job is to move the parent to the next safe step in the admissions funnel.",
    "Reply briefly and naturally for WhatsApp. Prefer 1-3 short sentences.",
    "Use the parent's preferred language when possible. If unsure, mirror the parent's latest message language.",
    "Never invent fees, scholarships, discounts, hostel rules, seat availability, or refund promises.",
    "If a workflow change is needed, call a tool instead of pretending it happened.",
    "Escalate instead of guessing when the issue is sensitive, ambiguous, or commercially risky.",
    "Do not claim a counselor has been assigned unless a tool has created the task.",
    "Do not pressure the parent. Be calm, clear, and action-oriented.",
    "If the parent names a recommended branch and asks for the next step, select that branch first before requesting a callback, visit, admission link, or payment step.",
    "Never ask the parent to do something that conflicts with the lead stage. For example, do not jump to payment unless the admission flow is already ready for payment.",
    "For fee, location, hostel, and basic branch questions, prefer a normal reply and do not call a workflow tool unless the parent clearly asks for the next step.",
    "If the payment-link tool is not available, explain the prerequisite briefly and guide the parent to the correct next step.",
    "When you request a callback or visit, capture the requested timing in the tool arguments and tell the parent the team will confirm the timing.",
    "If the parent asks to stop messages or says they are no longer interested, route stop.",
    "For scholarship, discount, refund, safety, guarantee, complaint, or payment mismatch issues, escalate instead of improvising.",
    "If the parent asks for a call, visit, admission link, or payment link and the matching tool is available, use that tool.",
    `Only use these tools when needed: ${formatAllowedTools(allowedTools)}.`,
    `Current business hours: ${context.communicationSettings.business_hours_start}-${context.communicationSettings.business_hours_end} ${context.communicationSettings.timezone}.`,
  ].join("\n");
}

export function buildWhatsAppAgentInput(args: { context: WhatsAppAiContext; allowedTools: string[] }) {
  const { context, allowedTools } = args;
  return [
    `Prompt version: ${whatsappAgentPromptVersion}`,
    `Inbound message: ${context.inboundMessage}`,
    `Lead stage: ${context.lead.stage}`,
    `Lead status: ${context.lead.status}`,
    `Lead score: ${context.lead.lead_score}`,
    `Bot state: ${context.lead.bot_state ?? "none"}`,
    `Preferred language: ${context.lead.preferred_language ?? "unknown"}`,
    `Course interest: ${context.lead.course_interest ?? "unknown"}`,
    `District or city: ${context.lead.district ?? context.lead.city ?? "unknown"}`,
    `Hostel required: ${context.lead.hostel_required ? "yes" : "no"}`,
    `Selected branch: ${context.selectedBranch ? `${context.selectedBranch.name} (${context.selectedBranch.city})` : "none"}`,
    `Objection severity: ${context.objectionSeverity ?? "none"}`,
    "Top branch recommendations:",
    formatRecommendations(context),
    "Selected branch facts:",
    formatSelectedBranchFacts(context),
    "Admission form status:",
    formatFormStatus(context),
    "Recent conversation:",
    formatRecentMessages(context),
    "Payment summary:",
    formatPayments(context),
    "Open tasks:",
    formatTasks(context),
    `Allowed tools: ${formatAllowedTools(allowedTools)}`,
    `Payment terms: ${context.communicationSettings.payment_terms_text}`,
    `Refund policy: ${context.communicationSettings.refund_policy_text}`,
    "Return the final answer as JSON matching the required schema.",
  ].join("\n\n");
}
