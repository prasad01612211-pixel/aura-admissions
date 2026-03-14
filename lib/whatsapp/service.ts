import "server-only";

import { publicEnv } from "@/lib/env";
import { shouldAttemptInboundWhatsAppAi, tryHandleInboundWhatsAppWithAi } from "@/lib/ai/router";
import { normalizePhoneNumber, titleCase } from "@/lib/import/normalizers";
import { getLocalActiveContext } from "@/lib/data/local-state";
import { getActiveBranchProfiles } from "@/lib/data/branches";
import { getRecommendationScopeMode, recommendBranches } from "@/lib/branch-matching/recommend";
import {
  createCampaignRecord,
  createManualTask,
  ensureBranchViewed,
  ensureFormStarted,
  findLeadByPhone,
  getLeadWorkflowSnapshot,
  markLeadContacted,
  markLeadReplied,
  persistLeadWorkflowUpdate,
  recordLeadConversation,
  requestCampusVisit,
  requestCounselorCallback,
  updateConversationDeliveryStatus,
} from "@/lib/admission/service";
import { buildObjectionLog } from "@/lib/operations/objections";
import { evaluateWhatsAppGuardrails } from "@/lib/whatsapp/guardrails";
import {
  readRuntimeMessageEvents,
  upsertRuntimeMessageEvent,
  upsertRuntimeObjectionLog,
  upsertRuntimeRecommendation,
} from "@/lib/runtime/ops-store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { upsertRuntimeCampaign } from "@/lib/runtime/store";
import { sendWhatsAppTemplateMessage, sendWhatsAppTextMessage } from "@/lib/whatsapp/provider";
import { renderWhatsAppTemplate, type WhatsAppTemplateName } from "@/lib/whatsapp/templates";
import type { BranchProfile, Campaign, Lead } from "@/types/domain";
import type { MessageEvent, Recommendation } from "@/types/operations";

type ReplyIntent =
  | "affirmative"
  | "callback"
  | "visit"
  | "apply"
  | "payment"
  | "not_interested"
  | "faq_fee"
  | "faq_hostel"
  | "faq_location"
  | "unknown";

type ParsedInboundMessage = {
  providerMessageId: string | null;
  from: string;
  text: string;
  raw: Record<string, unknown>;
};

type ParsedStatusUpdate = {
  providerMessageId: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
};

const affirmativeWords = new Set(["yes", "y", "ok", "okay", "sure", "interested", "show options", "show"]);

function getAppBaseUrl() {
  return publicEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function getLeadPhone(lead: Lead) {
  return normalizePhoneNumber(lead.parent_phone ?? lead.student_phone ?? "");
}

function extractCourse(text: string) {
  const normalized = normalizeText(text);
  if (/\bmpc\b/.test(normalized)) return "MPC";
  if (/\bbipc\b|\bbpc\b/.test(normalized)) return "BiPC";
  if (/\bmec\b/.test(normalized)) return "MEC";
  if (/\bcec\b/.test(normalized)) return "CEC";
  return null;
}

function extractHostelPreference(text: string) {
  const normalized = normalizeText(text);
  if (/\b(hostel|residential|yes|required|need hostel)\b/.test(normalized)) return true;
  if (/\b(no hostel|day scholar|dayscholar|no)\b/.test(normalized)) return false;
  return null;
}

function extractVisitSlot(text: string) {
  const normalized = normalizeText(text);
  if (normalized.includes("today")) return "Today";
  if (normalized.includes("tomorrow")) return "Tomorrow";
  if (normalized.includes("weekend") || normalized.includes("sunday") || normalized.includes("saturday")) return "Weekend";
  return null;
}

function extractIntent(text: string): ReplyIntent {
  const normalized = normalizeText(text);

  if (!normalized) return "unknown";
  if (normalized.includes("stop") || normalized.includes("not interested") || normalized === "no") return "not_interested";
  if (normalized.includes("call") || normalized.includes("counselor") || normalized.includes("counsellor")) return "callback";
  if (normalized.includes("visit") || normalized.includes("campus")) return "visit";
  if (normalized.includes("apply") || normalized.includes("admission") || normalized.includes("form")) return "apply";
  if (normalized.includes("payment") || normalized === "paid" || normalized.includes("pay")) return "payment";
  if (normalized.includes("fee") || normalized.includes("cost")) return "faq_fee";
  if (normalized.includes("hostel")) return "faq_hostel";
  if (normalized.includes("location") || normalized.includes("address") || normalized.includes("where")) return "faq_location";
  if (affirmativeWords.has(normalized)) return "affirmative";
  return "unknown";
}

function getMissingQualificationStep(lead: Lead) {
  if (!lead.student_name) return "student_name";
  if (!lead.district && !lead.city && !lead.pincode) return "district";
  if (!lead.course_interest) return "course";
  if (lead.hostel_required === false && lead.bot_state === "awaiting_hostel") return "hostel";
  if (lead.bot_state === "awaiting_hostel" && lead.course_interest) return "hostel";
  return null;
}

function tryCaptureStudentName(text: string) {
  const normalized = normalizeText(text);
  if (!normalized || affirmativeWords.has(normalized)) {
    return null;
  }
  if (extractIntent(text) !== "unknown" && extractIntent(text) !== "affirmative") {
    return null;
  }
  if (extractCourse(text)) {
    return null;
  }
  return titleCase(text.replace(/[^a-zA-Z\s.]/g, " ").replace(/\s+/g, " ").trim());
}

function tryCaptureLocation(text: string) {
  const normalized = text.trim();
  if (!normalized || normalized.length < 3) {
    return null;
  }
  if (extractCourse(text)) {
    return null;
  }
  return titleCase(normalized);
}

function buildNextQuestion(lead: Lead) {
  const missingStep = getMissingQualificationStep(lead);
  switch (missingStep) {
    case "student_name":
      return "Please share the student name.";
    case "district":
      return "Please share your area, district, or pincode.";
    case "course":
      return "Which course are you looking for? Reply with MPC, BiPC, MEC, or CEC.";
    case "hostel":
      return "Is hostel required? Reply YES or NO.";
    default:
      return null;
  }
}

function buildRecommendationMessage(args: {
  leadId: string;
  recommendations: Awaited<ReturnType<typeof recommendBranches>>;
}) {
  const lines = [
    "Based on your preference, here are the best options:",
    ...args.recommendations.map(
      (branch, index) => `${index + 1}. ${branch.branch_name} - ${branch.city} (${branch.reasons.slice(0, 2).join(", ") || "Good fit"})`,
    ),
    "Reply 1, 2, or 3 to see branch details. You can also reply COUNSELOR, VISIT, or APPLY.",
  ];

  return lines.join("\n");
}

function buildBranchDetailMessage(branch: BranchProfile, leadId: string) {
  const detailUrl = `${getAppBaseUrl()}/branches/${branch.code}?leadId=${leadId}`;
  const admissionUrl = `${getAppBaseUrl()}/admission/${leadId}?branch=${branch.code}`;
  const courses = branch.courses.map((course) => course.code).join(", ");

  return [
    `${branch.name}`,
    `${branch.city}, ${branch.district}`,
    `Courses: ${courses}`,
    branch.latest_fee_snapshot?.tuition_fee ? `Tuition: ₹${branch.latest_fee_snapshot.tuition_fee.toLocaleString("en-IN")}` : null,
    `Hostel: ${branch.hostel_available ? "Available" : "Not available"}`,
    `Transport: ${branch.transport_available ? "Available" : "Not available"}`,
    branch.trust_score ? `Trust score: ${branch.trust_score}/100` : null,
    `Branch details: ${detailUrl}`,
    `Continue admission: ${admissionUrl}`,
    "Reply COUNSELOR, VISIT, or APPLY.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function persistMessageEvent(event: MessageEvent) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return upsertRuntimeMessageEvent(event);
  }

  const { error } = await supabase.from("message_events").upsert(event as never);
  if (error) {
    throw new Error(error.message);
  }

  return event;
}

async function hasProcessedProviderMessage(providerMessageId: string | null) {
  if (!providerMessageId) {
    return false;
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return (await readRuntimeMessageEvents()).some((event) => event.provider_message_id === providerMessageId);
  }

  const { data } = await supabase
    .from("message_events")
    .select("id")
    .eq("provider_message_id", providerMessageId)
    .limit(1);
  return Boolean((data ?? [])[0]);
}

async function persistRecommendationRows(args: {
  leadId: string;
  recommendations: Awaited<ReturnType<typeof recommendBranches>>;
  branchProfiles: BranchProfile[];
}) {
  const supabase = createAdminSupabaseClient();

  for (const [index, recommendation] of args.recommendations.entries()) {
    const matchedProgram = args.branchProfiles
      .find((branch) => branch.id === recommendation.branch_id)
      ?.courses.find((course) => course.code === recommendation.branch_code || recommendation.reasons.includes(course.code));

    const row: Recommendation = {
      id: `${args.leadId}-${recommendation.branch_id}-${index + 1}`,
      lead_id: args.leadId,
      branch_id: recommendation.branch_id,
      program_id: null,
      rank_position: index + 1,
      score: recommendation.score,
      reasons_json: recommendation.reasons,
      was_viewed: false,
      was_clicked: false,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      await supabase.from("recommendations").upsert(row as never);
    } else {
      await upsertRuntimeRecommendation({
        ...row,
        program_id: matchedProgram ? null : null,
      });
    }
  }
}

async function persistObjection(args: { leadId: string; text: string }) {
  const objection = buildObjectionLog(args);
  if (!objection) {
    return null;
  }

  const supabase = createAdminSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from("objection_logs").insert(objection as never);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    await upsertRuntimeObjectionLog(objection);
  }

  await persistLeadWorkflowUpdate({
    leadId: args.leadId,
    eventType: `objection_${objection.objection_type}`,
    eventSource: "whatsapp",
    payload: {
      severity: objection.severity,
      normalized_objection: objection.normalized_objection,
    },
  });

  return objection;
}

async function sendBotText(args: {
  leadId: string;
  to: string;
  body: string;
  eventType: string;
  payload?: Record<string, unknown>;
  eventSource?: string;
}) {
  const result = await sendWhatsAppTextMessage({
    to: args.to,
    body: args.body,
  });

  await recordLeadConversation({
    leadId: args.leadId,
    direction: "outbound",
    messageType: "text",
    providerMessageId: result.provider_message_id,
    messageBody: args.body,
    deliveryStatus: result.delivery_status,
  });

  await persistLeadWorkflowUpdate({
    leadId: args.leadId,
    leadPatch: {
      last_outgoing_at: new Date().toISOString(),
    },
    eventType: args.eventType,
    eventSource: args.eventSource ?? "bot",
    payload: {
      provider_message_id: result.provider_message_id,
      ...args.payload,
    },
  });

  await persistMessageEvent({
    id: `msg-${result.provider_message_id}`,
    conversation_id: null,
    lead_id: args.leadId,
    direction: "outbound",
    message_type: "text",
    template_name: null,
    content: args.body,
    metadata_json: args.payload ?? {},
    delivery_status: result.delivery_status,
    provider_message_id: result.provider_message_id,
    created_at: new Date().toISOString(),
  });

  return result;
}

async function sendBotTemplate(args: {
  leadId: string;
  to: string;
  templateName: WhatsAppTemplateName;
  variables?: Record<string, string | number | null | undefined>;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  const result = await sendWhatsAppTemplateMessage({
    to: args.to,
    templateName: args.templateName,
    variables: args.variables,
  });

  await recordLeadConversation({
    leadId: args.leadId,
    direction: "outbound",
    messageType: "template",
    providerMessageId: result.provider_message_id,
    messageBody: result.preview_text,
    templateName: args.templateName,
    deliveryStatus: result.delivery_status,
  });

  await persistLeadWorkflowUpdate({
    leadId: args.leadId,
    leadPatch: {
      last_outgoing_at: new Date().toISOString(),
    },
    eventType: args.eventType,
    eventSource: "bot",
    payload: {
      provider_message_id: result.provider_message_id,
      template_name: args.templateName,
      ...args.payload,
    },
  });

  await persistMessageEvent({
    id: `msg-${result.provider_message_id}`,
    conversation_id: null,
    lead_id: args.leadId,
    direction: "outbound",
    message_type: "template",
    template_name: args.templateName,
    content: result.preview_text,
    metadata_json: args.payload ?? {},
    delivery_status: result.delivery_status,
    provider_message_id: result.provider_message_id,
    created_at: new Date().toISOString(),
  });

  return result;
}

async function answerBranchFaq(args: {
  lead: Lead;
  leadId: string;
  phone: string;
  intent: ReplyIntent;
}) {
  const availableBranches = await getActiveBranchProfiles();
  const branch =
    availableBranches.find((item) => item.id === args.lead.assigned_branch_id || item.id === args.lead.preferred_branch_id) ??
    null;

  if (!branch) {
    await sendBotText({
      leadId: args.leadId,
      to: args.phone,
      body: "Please choose a branch first. Reply 1, 2, or 3 from the recommended list.",
      eventType: "branch_action_prompt_sent",
    });
    return;
  }

  let body = `Here are the details for ${branch.name}.\n`;
  if (args.intent === "faq_fee") {
    body += "Fee details vary by course and branch. We will connect you with a counselor for the latest fee and scholarship details.";
  } else if (args.intent === "faq_hostel") {
    body += `Hostel is ${branch.hostel_available ? "available" : "not available"} for this branch.`;
  } else if (args.intent === "faq_location") {
    body += `Location: ${branch.address}\nMap: ${branch.maps_url || "Map link will be shared by the counselor."}`;
  }

  await sendBotText({
    leadId: args.leadId,
    to: args.phone,
    body,
    eventType: "branch_faq_answered",
    payload: {
      branch_id: branch.id,
      topic: args.intent,
    },
  });
}

async function qualifyAndRespond(args: { lead: Lead; message: string; phone: string }) {
  const course = extractCourse(args.message);
  const hostel = extractHostelPreference(args.message);
  const leadPatch: Partial<Lead> = {};

  if (!args.lead.student_name) {
    const studentName = tryCaptureStudentName(args.message);
    if (studentName) {
      leadPatch.student_name = studentName;
      leadPatch.bot_state = "awaiting_district";
    }
  }

  if ((!args.lead.district && !args.lead.city && !args.lead.pincode) || args.lead.bot_state === "awaiting_district") {
    const maybeLocation = tryCaptureLocation(args.message);
    if (maybeLocation && !extractCourse(args.message) && extractIntent(args.message) === "unknown") {
      leadPatch.district = leadPatch.district ?? maybeLocation;
      leadPatch.city = leadPatch.city ?? maybeLocation;
      leadPatch.bot_state = "awaiting_course";
    }
  }

  if (!args.lead.course_interest && course) {
    leadPatch.course_interest = course;
    leadPatch.bot_state = "awaiting_hostel";
  }

  if ((args.lead.bot_state === "awaiting_hostel" || args.lead.course_interest) && hostel !== null) {
    leadPatch.hostel_required = hostel;
  }

  const hasPatch = Object.keys(leadPatch).length > 0;
  const updatedLead = hasPatch
    ? (
        await persistLeadWorkflowUpdate({
          leadId: args.lead.id,
          leadPatch,
          eventType: "qualification_progressed",
          eventSource: "bot",
          payload: leadPatch,
        })
      ).lead
    : args.lead;

  const missingQuestion = buildNextQuestion(updatedLead);
  if (missingQuestion) {
    const nextBotState =
      updatedLead.student_name && updatedLead.district && updatedLead.course_interest
        ? "awaiting_hostel"
        : updatedLead.student_name && updatedLead.district
          ? "awaiting_course"
          : updatedLead.student_name
            ? "awaiting_district"
            : "awaiting_student_name";

    await persistLeadWorkflowUpdate({
      leadId: updatedLead.id,
      leadPatch: {
        bot_state: nextBotState,
      },
      eventType: "bot_state_updated",
      eventSource: "bot",
      payload: {
        bot_state: nextBotState,
      },
    });

    await sendBotText({
      leadId: updatedLead.id,
      to: args.phone,
      body: missingQuestion,
      eventType: "qualification_question_sent",
    });

    return;
  }

  const branchProfiles = await getActiveBranchProfiles();
  const recommendations = recommendBranches(
    {
      pincode: updatedLead.pincode,
      district: updatedLead.district,
      city: updatedLead.city,
      locality: updatedLead.area ?? updatedLead.preferred_location ?? null,
      course_interest: updatedLead.course_interest,
      hostel_required: updatedLead.hostel_required,
      scope_mode: getRecommendationScopeMode(),
    },
    branchProfiles,
  );

  await persistRecommendationRows({
    leadId: updatedLead.id,
    recommendations,
    branchProfiles,
  });

  await persistLeadWorkflowUpdate({
    leadId: updatedLead.id,
    leadPatch: {
      stage: "branch_shown",
      status: updatedLead.lead_score >= 50 ? "hot" : "warm",
      bot_state: "awaiting_branch_action",
    },
    eventType: "lead_qualified",
    eventSource: "bot",
    payload: {
      district: updatedLead.district,
      course_interest: updatedLead.course_interest,
      hostel_required: updatedLead.hostel_required,
      recommendation_count: recommendations.length,
    },
  });

  await sendBotText({
    leadId: updatedLead.id,
    to: args.phone,
    body: buildRecommendationMessage({
      leadId: updatedLead.id,
      recommendations,
    }),
    eventType: "branch_recommendation_sent",
    payload: {
      branch_ids: recommendations.map((item) => item.branch_id),
    },
  });
}

async function handleQualifiedLeadReply(args: { lead: Lead; message: string; phone: string }) {
  const intent = extractIntent(args.message);

  if (["faq_fee", "faq_hostel", "faq_location"].includes(intent)) {
    await persistLeadWorkflowUpdate({
      leadId: args.lead.id,
      eventType:
        intent === "faq_fee" ? "faq_fee_detected" : intent === "faq_hostel" ? "faq_hostel_detected" : "faq_location_detected",
      eventSource: "whatsapp",
      payload: {
        message: args.message,
      },
    });
    await answerBranchFaq({
      lead: args.lead,
      leadId: args.lead.id,
      phone: args.phone,
      intent,
    });
    return;
  }

  const branchProfiles = await getActiveBranchProfiles();
  const recommendations = recommendBranches(
    {
      pincode: args.lead.pincode,
      district: args.lead.district,
      city: args.lead.city,
      locality: args.lead.area ?? args.lead.preferred_location ?? null,
      course_interest: args.lead.course_interest,
      hostel_required: args.lead.hostel_required,
      scope_mode: getRecommendationScopeMode(),
    },
    branchProfiles,
  );

  const normalized = normalizeText(args.message);
  const numericChoice = Number.parseInt(normalized, 10);

  if (!Number.isNaN(numericChoice) && numericChoice >= 1 && numericChoice <= recommendations.length) {
    const selected = recommendations[numericChoice - 1];
    const branch = branchProfiles.find((item) => item.id === selected.branch_id);
    if (!branch) {
      return;
    }

    await ensureBranchViewed({
      leadId: args.lead.id,
      branchId: branch.id,
    });

    await sendBotText({
      leadId: args.lead.id,
      to: args.phone,
      body: buildBranchDetailMessage(branch, args.lead.id),
      eventType: "branch_detail_sent",
      payload: {
        branch_id: branch.id,
      },
    });
    return;
  }

  const selectedBranch =
    branchProfiles.find((item) => item.id === args.lead.assigned_branch_id || item.id === args.lead.preferred_branch_id) ??
    branchProfiles.find((item) => item.id === recommendations[0]?.branch_id) ??
    null;

  if (intent === "callback") {
    if (!selectedBranch) return;
    const result = await requestCounselorCallback({
      leadId: args.lead.id,
      branchId: selectedBranch.id,
    });
    await sendBotTemplate({
      leadId: args.lead.id,
      to: args.phone,
      templateName: "callback_confirmation_v1",
      variables: {
        branch_name: selectedBranch.name,
        counselor_name: "Admissions Counselor",
      },
      eventType: "callback_confirmation_sent",
      payload: {
        task_id: result.task.id,
        branch_id: selectedBranch.id,
      },
    });
    return;
  }

  if (intent === "visit") {
    if (!selectedBranch) return;
    const preferredSlot = extractVisitSlot(args.message) ?? "To be confirmed";
    const result = await requestCampusVisit({
      leadId: args.lead.id,
      branchId: selectedBranch.id,
      preferredSlot,
    });
    await sendBotTemplate({
      leadId: args.lead.id,
      to: args.phone,
      templateName: "visit_confirmation_v1",
      variables: {
        branch_name: selectedBranch.name,
        visit_slot: preferredSlot,
      },
      eventType: "visit_confirmation_sent",
      payload: {
        task_id: result.task.id,
        branch_id: selectedBranch.id,
      },
    });
    return;
  }

  if (intent === "apply" || intent === "payment") {
    if (!selectedBranch) return;
    await ensureFormStarted({
      leadId: args.lead.id,
      branchId: selectedBranch.id,
    });

    const admissionUrl = `${getAppBaseUrl()}/admission/${args.lead.id}?branch=${selectedBranch.code}`;
    await sendBotText({
      leadId: args.lead.id,
      to: args.phone,
      body: `You can continue the admission here: ${admissionUrl}\nReply DONE after completing the form.`,
      eventType: "admission_link_sent",
      payload: {
        branch_id: selectedBranch.id,
        admission_url: admissionUrl,
      },
    });
    return;
  }

  await sendBotText({
    leadId: args.lead.id,
    to: args.phone,
    body: "Reply 1, 2, or 3 to see a branch. You can also reply COUNSELOR, VISIT, or APPLY.",
    eventType: "branch_action_prompt_sent",
  });
}

export async function createWhatsAppCampaign(args: {
  name: string;
  templateName: WhatsAppTemplateName;
  sourceBatch?: string | null;
  targetCount: number;
}) {
  return createCampaignRecord({
    name: args.name,
    sourceBatch: args.sourceBatch ?? null,
    templateName: args.templateName,
    targetCount: args.targetCount,
  });
}

async function loadDispatchCandidates(limit: number) {
  const supabase = createAdminSupabaseClient();

  if (supabase) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .in("stage", ["imported", "contacted", "replied", "qualified", "branch_shown"])
      .in("status", ["new", "warm", "hot", "followup"])
      .not("parent_phone", "is", null)
      .order("created_at", { ascending: true })
      .limit(limit);

    return ((data ?? []) as Lead[]).filter((lead) => Boolean(getLeadPhone(lead)));
  }

  const localContext = await getLocalActiveContext();
  return localContext.leads.filter((lead) => Boolean(getLeadPhone(lead))).slice(0, limit);
}

export async function dispatchWhatsAppCampaign(args: {
  campaignId?: string | null;
  name?: string;
  templateName: WhatsAppTemplateName;
  limit?: number;
}) {
  const limit = Math.min(Math.max(args.limit ?? 100, 1), 250);
  const targetLeads = await loadDispatchCandidates(limit);
  const supabase = createAdminSupabaseClient();
  const campaign =
    args.campaignId && supabase
      ? ((await supabase.from("campaigns").select("*").eq("id", args.campaignId).maybeSingle()).data as Campaign | null) ?? null
      : null;

  const activeCampaign =
    (campaign as Campaign | null) ??
    (await createWhatsAppCampaign({
      name: args.name ?? `WhatsApp dispatch ${new Date().toLocaleDateString("en-IN")}`,
      templateName: args.templateName,
      targetCount: targetLeads.length,
    }));

  let sentCount = 0;

  for (const lead of targetLeads) {
    const phone = getLeadPhone(lead);
    if (!phone) {
      continue;
    }

    const guardrail = await evaluateWhatsAppGuardrails({
      lead,
      to: phone,
    });

    if (!guardrail.allowed) {
      await persistLeadWorkflowUpdate({
        leadId: lead.id,
        eventType: "whatsapp_send_blocked",
        eventSource: "guardrail",
        payload: {
          reason: guardrail.reason,
          sandbox_mode: guardrail.sandbox_mode,
        },
      });
      continue;
    }

    const sendResult = await sendWhatsAppTemplateMessage({
      to: phone,
      templateName: args.templateName,
      variables: {
        parent_name: lead.parent_name ?? "Parent",
        agent_name: "Admissions Desk",
        consultancy_name: "Admissions Desk",
        city: lead.city ?? lead.district ?? "your area",
      },
    });

    await markLeadContacted({
      leadId: lead.id,
      campaignId: activeCampaign.id,
      templateName: args.templateName,
      providerMessageId: sendResult.provider_message_id,
      messageBody: sendResult.preview_text,
    });

    sentCount += 1;
  }

  const nextCampaign: Campaign = {
    ...activeCampaign,
    sent_count: sentCount,
    target_count: targetLeads.length,
    status: "completed",
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    await supabase.from("campaigns").upsert(nextCampaign as never);
  } else {
    await upsertRuntimeCampaign(nextCampaign);
  }

  return {
    campaign: nextCampaign,
    dispatched: sentCount,
    skipped: targetLeads.length - sentCount,
  };
}

function parseWebhookText(message: Record<string, unknown>) {
  const text = message.text;
  if (text && typeof text === "object" && "body" in text) {
    return String((text as { body?: string }).body ?? "");
  }

  const interactive = message.interactive;
  if (interactive && typeof interactive === "object") {
    const buttonReply = (interactive as { button_reply?: { title?: string } }).button_reply;
    if (buttonReply?.title) return String(buttonReply.title);
    const listReply = (interactive as { list_reply?: { title?: string } }).list_reply;
    if (listReply?.title) return String(listReply.title);
  }

  return "";
}

function parseInboundMessages(payload: Record<string, unknown>) {
  const rows: ParsedInboundMessage[] = [];
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray((entry as { changes?: unknown[] }).changes) ? (entry as { changes: unknown[] }).changes : [];
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> }).value;
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      for (const item of messages) {
        if (!item || typeof item !== "object") continue;
        const message = item as Record<string, unknown>;
        rows.push({
          providerMessageId: typeof message.id === "string" ? message.id : null,
          from: String(message.from ?? ""),
          text: parseWebhookText(message),
          raw: message,
        });
      }
    }
  }

  return rows;
}

function parseStatusUpdates(payload: Record<string, unknown>) {
  const rows: ParsedStatusUpdate[] = [];
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray((entry as { changes?: unknown[] }).changes) ? (entry as { changes: unknown[] }).changes : [];
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> }).value;
      const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
      for (const item of statuses) {
        if (!item || typeof item !== "object") continue;
        const status = item as Record<string, unknown>;
        const mappedStatus =
          status.status === "delivered" || status.status === "read" || status.status === "failed" || status.status === "sent"
            ? (status.status as ParsedStatusUpdate["status"])
            : "queued";

        if (typeof status.id === "string") {
          rows.push({
            providerMessageId: status.id,
            status: mappedStatus,
          });
        }
      }
    }
  }

  return rows;
}

export async function handleWhatsAppInbound(payload: Record<string, unknown>) {
  const messages = parseInboundMessages(payload);
  const processed: Array<{ lead_id: string; phone: string }> = [];
  const unresolvedPhones: string[] = [];

  for (const message of messages) {
    const phone = normalizePhoneNumber(message.from);
    if (!phone) {
      continue;
    }

    if (await hasProcessedProviderMessage(message.providerMessageId)) {
      continue;
    }

    const resolvedLead = await findLeadByPhone(phone);
    if (!resolvedLead) {
      unresolvedPhones.push(phone);
      continue;
    }

    const repliedLead = await markLeadReplied({
      leadId: resolvedLead.lead.id,
      providerMessageId: message.providerMessageId,
      messageBody: message.text,
      payload: message.raw,
    });

    await persistMessageEvent({
      id: `msg-${message.providerMessageId ?? `${repliedLead.id}-${Date.now()}`}`,
      conversation_id: null,
      lead_id: repliedLead.id,
      direction: "inbound",
      message_type: "text",
      template_name: null,
      content: message.text,
      metadata_json: message.raw,
      delivery_status: "received",
      provider_message_id: message.providerMessageId,
      created_at: new Date().toISOString(),
    });

    const objection = await persistObjection({
      leadId: repliedLead.id,
      text: message.text,
    });

    if (objection?.severity === "high") {
      await createManualTask({
        leadId: repliedLead.id,
        branchId: repliedLead.assigned_branch_id ?? repliedLead.preferred_branch_id ?? null,
        taskType: "closure",
        priority: "urgent",
        dueAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        notes: `${objection.normalized_objection}. ${objection.suggested_response ?? "Review and call parent."}`,
      });
    }

    if (extractIntent(message.text) === "not_interested") {
      await persistLeadWorkflowUpdate({
        leadId: repliedLead.id,
        leadPatch: {
          stage: "lost",
          status: "lost",
        },
        eventType: "lead_lost",
        eventSource: "whatsapp",
        payload: {
          reason: "parent_opt_out",
        },
      });

      await sendBotText({
        leadId: repliedLead.id,
        to: phone,
        body: "Understood. We will stop admission updates for now. If you need help later, message us here.",
        eventType: "opt_out_confirmation_sent",
      });
      processed.push({ lead_id: repliedLead.id, phone });
      continue;
    }

    const snapshot = await getLeadWorkflowSnapshot(repliedLead.id);
    const lead = snapshot?.lead ?? repliedLead;
    const missingStep = getMissingQualificationStep(lead);

    if (
      shouldAttemptInboundWhatsAppAi({
        lead,
        message: message.text,
        missingQualificationStep: missingStep,
        objectionSeverity: objection?.severity ?? null,
      })
    ) {
      const aiDecision = await tryHandleInboundWhatsAppWithAi({
        leadId: lead.id,
        phone,
        message: message.text,
        objectionSeverity: objection?.severity ?? null,
      });

      if (aiDecision.handled) {
        await sendBotText({
          leadId: lead.id,
          to: phone,
          body: aiDecision.replyText,
          eventType: aiDecision.eventType,
          payload: aiDecision.payload,
          eventSource: "ai_bot",
        });
        processed.push({ lead_id: lead.id, phone });
        continue;
      }

      if (aiDecision.error) {
        await persistLeadWorkflowUpdate({
          leadId: lead.id,
          eventType: "ai_route_failed",
          eventSource: "ai_bot",
          payload: {
            reason: aiDecision.reason,
            error: aiDecision.error,
          },
        });
      }
    }

    if (missingStep) {
      await qualifyAndRespond({
        lead,
        message: message.text,
        phone,
      });
    } else {
      await handleQualifiedLeadReply({
        lead,
        message: message.text,
        phone,
      });
    }

    processed.push({ lead_id: lead.id, phone });
  }

  return {
    received: messages.length,
    processed: processed.length,
    unresolved: unresolvedPhones.length,
    unresolvedPhones,
  };
}

export async function handleWhatsAppStatus(payload: Record<string, unknown>) {
  const statuses = parseStatusUpdates(payload);
  let updated = 0;

  for (const status of statuses) {
    await persistMessageEvent({
      id: `status-${status.providerMessageId}-${status.status}`,
      conversation_id: null,
      lead_id: "",
      direction: "outbound",
      message_type: "text",
      template_name: null,
      content: null,
      metadata_json: {
        status: status.status,
      },
      delivery_status: status.status,
      provider_message_id: status.providerMessageId,
      created_at: new Date().toISOString(),
    }).catch(() => null);

    const conversation = await updateConversationDeliveryStatus({
      providerMessageId: status.providerMessageId,
      status: status.status,
    });

    if (conversation) {
      updated += 1;
    }
  }

  return {
    received: statuses.length,
    updated,
  };
}

export function getWhatsAppWebhookVerificationResponse(searchParams: URLSearchParams) {
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return challenge;
  }

  return null;
}

export function getWhatsAppTemplatePreview(name: WhatsAppTemplateName, variables?: Record<string, string | number | null | undefined>) {
  return renderWhatsAppTemplate(name, variables);
}
