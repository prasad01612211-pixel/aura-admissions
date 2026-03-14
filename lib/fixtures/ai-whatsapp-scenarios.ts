import type { WhatsAppAiStructuredReply } from "@/lib/ai/reply-schema";
import type { WhatsAppAiContextOverride, WhatsAppAiMockResponse } from "@/lib/ai/types";
import { branchProfiles, leads } from "@/lib/fixtures/demo-data";
import type { Conversation, Lead } from "@/types/domain";

export interface WhatsAppAiDryRunScenario {
  id: string;
  title: string;
  leadSourceLeadId: string;
  inboundMessage: string;
  expectedRoute: "reply" | "escalate" | "stop";
  expectedTools?: string[];
  forbiddenTools?: string[];
  notes?: string;
  contextOverride?: WhatsAppAiContextOverride;
  mockResponses?: WhatsAppAiMockResponse[];
}

function makeConversation(id: string, leadId: string, direction: Conversation["direction"], messageBody: string): Conversation {
  return {
    id,
    lead_id: leadId,
    channel: "whatsapp",
    direction,
    message_type: "text",
    provider_message_id: `${id}-provider`,
    message_body: messageBody,
    media_url: null,
    template_name: null,
    delivery_status: direction === "inbound" ? "received" : "delivered",
    created_at: new Date("2026-03-14T10:00:00.000Z").toISOString(),
  };
}

function findLeadBySourceLeadId(sourceLeadId: string): Lead {
  const lead = leads.find((item) => item.source_lead_id === sourceLeadId);
  if (!lead) {
    throw new Error(`Lead not found for source lead id: ${sourceLeadId}`);
  }
  return lead;
}

function findBranchIdByCode(code: string) {
  const branch = branchProfiles.find((item) => item.code === code);
  if (!branch) {
    throw new Error(`Branch not found for code: ${code}`);
  }
  return branch.id;
}

function getLeadBranchId(sourceLeadId: string) {
  const lead = findLeadBySourceLeadId(sourceLeadId);
  const branchId = lead.assigned_branch_id ?? lead.preferred_branch_id;
  if (!branchId) {
    throw new Error(`No branch set for source lead id: ${sourceLeadId}`);
  }
  return branchId;
}

function makeStructuredReply(reply: Partial<WhatsAppAiStructuredReply> & Pick<WhatsAppAiStructuredReply, "assistant_message">) {
  return JSON.stringify({
    language_code: "en",
    route: "reply",
    confidence: 0.86,
    crm_note: "Handled by offline dry-run mock.",
    follow_up_needed: false,
    ...reply,
  } satisfies WhatsAppAiStructuredReply);
}

function makeMockFunctionCallResponse(functionCalls: Array<{ name: string; arguments: Record<string, unknown> }>): WhatsAppAiMockResponse {
  return {
    functionCalls,
  };
}

function makeMockReplyResponse(reply: Partial<WhatsAppAiStructuredReply> & Pick<WhatsAppAiStructuredReply, "assistant_message">): WhatsAppAiMockResponse {
  return {
    outputText: makeStructuredReply(reply),
  };
}

const branchActionLead = findLeadBySourceLeadId("pilot-lead-005");
const branchSelectionLead = findLeadBySourceLeadId("pilot-lead-005");
const kukatpallyBranchId = findBranchIdByCode("NAR-KPHB");

export const whatsappAiDryRunScenarios: WhatsAppAiDryRunScenario[] = [
  {
    id: "fee-and-hostel-info",
    title: "Fee and hostel question stays informational",
    leadSourceLeadId: "pilot-lead-005",
    inboundMessage: "What is the latest fee for the Kukatpally MEC branch? We also need hostel details.",
    expectedRoute: "reply",
    forbiddenTools: ["get_or_create_payment_link"],
    notes: "The bot should answer carefully and avoid jumping to payment.",
    mockResponses: [
      makeMockReplyResponse({
        assistant_message:
          "The Kukatpally branch can share the latest verified fee snapshot, and I can also help with hostel and transport details. If you want the exact current amount, I can ask our counselor to confirm the latest branch update.",
        crm_note: "Stayed informational for fee and hostel query.",
      }),
    ],
  },
  {
    id: "scholarship-guarantee",
    title: "Scholarship plus guarantee request escalates",
    leadSourceLeadId: "pilot-lead-005",
    inboundMessage: "Can you give scholarship and guarantee the admission if I pay now?",
    expectedRoute: "escalate",
    expectedTools: ["escalate_to_human"],
    forbiddenTools: ["get_or_create_payment_link"],
  },
  {
    id: "callback-natural-language",
    title: "Natural-language callback request creates counselor follow-up",
    leadSourceLeadId: "pilot-lead-005",
    inboundMessage: "Please ask a counselor to call me after 6 PM.",
    expectedRoute: "reply",
    expectedTools: ["request_callback"],
    mockResponses: [
      makeMockFunctionCallResponse([
        {
          name: "request_callback",
          arguments: {
            lead_id: branchActionLead.id,
            branch_id: getLeadBranchId("pilot-lead-005"),
            reason: "Parent requested a counselor callback after 6 PM.",
          },
        },
      ]),
      makeMockReplyResponse({
        assistant_message: "I have asked our counselor to call you after 6 PM. They will confirm the exact timing shortly.",
        crm_note: "Callback requested for after 6 PM.",
        follow_up_needed: true,
      }),
    ],
  },
  {
    id: "visit-sunday",
    title: "Visit request creates visit task",
    leadSourceLeadId: "pilot-lead-005",
    inboundMessage: "We want to visit this Sunday morning.",
    expectedRoute: "reply",
    expectedTools: ["request_visit"],
    mockResponses: [
      makeMockFunctionCallResponse([
        {
          name: "request_visit",
          arguments: {
            lead_id: branchActionLead.id,
            branch_id: getLeadBranchId("pilot-lead-005"),
            preferred_slot: "Sunday morning",
          },
        },
      ]),
      makeMockReplyResponse({
        assistant_message: "I have shared your Sunday morning visit request with our team. They will confirm the campus slot and send the visit details shortly.",
        crm_note: "Campus visit requested for Sunday morning.",
        follow_up_needed: true,
      }),
    ],
  },
  {
    id: "admission-link-request",
    title: "Admission link request starts the form flow",
    leadSourceLeadId: "pilot-lead-005",
    inboundMessage: "Send the admission form link for this branch.",
    expectedRoute: "reply",
    expectedTools: ["start_admission"],
    mockResponses: [
      makeMockFunctionCallResponse([
        {
          name: "start_admission",
          arguments: {
            lead_id: branchActionLead.id,
            branch_id: getLeadBranchId("pilot-lead-005"),
          },
        },
      ]),
      makeMockReplyResponse({
        assistant_message: "I have started the admission flow for this branch and shared the form link. Please fill it out, and I can help with the next step after that.",
        crm_note: "Admission flow started from branch conversation.",
        follow_up_needed: true,
      }),
    ],
  },
  {
    id: "payment-after-form",
    title: "Payment link request after form submission is allowed",
    leadSourceLeadId: "pilot-lead-010",
    inboundMessage: "We completed the form. Please resend the payment link.",
    expectedRoute: "reply",
    expectedTools: ["get_or_create_payment_link"],
    mockResponses: [
      makeMockFunctionCallResponse([
        {
          name: "get_or_create_payment_link",
          arguments: {
            lead_id: findLeadBySourceLeadId("pilot-lead-010").id,
            branch_id: getLeadBranchId("pilot-lead-010"),
          },
        },
      ]),
      makeMockReplyResponse({
        assistant_message: "I have resent the seat-lock payment link for your branch. If you face any issue while paying, reply here and I will get our team to help.",
        crm_note: "Payment link resent after form submission.",
        follow_up_needed: true,
      }),
    ],
  },
  {
    id: "payment-mismatch",
    title: "Already paid complaint escalates to human",
    leadSourceLeadId: "pilot-lead-011",
    inboundMessage: "We already paid but still got a reminder. Please check and call me.",
    expectedRoute: "escalate",
    expectedTools: ["escalate_to_human"],
    forbiddenTools: ["get_or_create_payment_link"],
  },
  {
    id: "hostel-safety",
    title: "Hostel safety concern escalates",
    leadSourceLeadId: "pilot-lead-018",
    inboundMessage: "Hostel safety is our main concern for our daughter. We want to speak to a human.",
    expectedRoute: "escalate",
    expectedTools: ["escalate_to_human"],
  },
  {
    id: "opt-out",
    title: "Opt-out should stop the flow",
    leadSourceLeadId: "pilot-lead-015",
    inboundMessage: "Stop messaging us. We are not interested.",
    expectedRoute: "stop",
    expectedTools: ["mark_not_interested"],
    mockResponses: [
      makeMockReplyResponse({
        assistant_message: "Understood. We will stop messages from our side.",
        route: "stop",
        confidence: 0.98,
        crm_note: "Parent opted out on WhatsApp.",
      }),
    ],
  },
  {
    id: "telugu-fee-question",
    title: "Telugu fee and hostel query stays informational",
    leadSourceLeadId: "pilot-lead-006",
    inboundMessage: "\u0c2b\u0c40\u0c1c\u0c41 \u0c0e\u0c02\u0c24 \u0c09\u0c02\u0c1f\u0c41\u0c02\u0c26\u0c3f? \u0c39\u0c3e\u0c38\u0c4d\u0c1f\u0c32\u0c4d \u0c09\u0c02\u0c26\u0c3e?",
    expectedRoute: "reply",
    forbiddenTools: ["get_or_create_payment_link"],
    mockResponses: [
      makeMockReplyResponse({
        assistant_message:
          "Latest verified fee details ni branch-wise share cheyyagalanu. Hostel availability kuda explain chestanu, exact current fee confirm kavali ante counselor ni connect chestanu.",
        language_code: "te",
        crm_note: "Answered Telugu fee and hostel query without pushing workflow.",
      }),
    ],
  },
  {
    id: "refund-question-hindi",
    title: "Refund question escalates",
    leadSourceLeadId: "pilot-lead-011",
    inboundMessage: "Agar payment karen aur branch change karna ho to refund milega kya?",
    expectedRoute: "escalate",
    expectedTools: ["escalate_to_human"],
  },
  {
    id: "location-map",
    title: "Location question stays informational",
    leadSourceLeadId: "pilot-lead-005",
    inboundMessage: "Is this branch near LB Nagar? Please send location details.",
    expectedRoute: "reply",
    forbiddenTools: ["get_or_create_payment_link"],
    mockResponses: [
      makeMockReplyResponse({
        assistant_message:
          "This branch is in Kukatpally, not near LB Nagar. I can share the exact address and map link for the branch you are viewing, and I can also suggest a closer option if you want.",
        crm_note: "Stayed informational for branch location request.",
      }),
    ],
  },
  {
    id: "competitor-discount",
    title: "Competitor discount negotiation escalates",
    leadSourceLeadId: "pilot-lead-005",
    inboundMessage: "Sri Chaitanya is giving discount. Can you beat that offer?",
    expectedRoute: "escalate",
    expectedTools: ["escalate_to_human"],
  },
  {
    id: "payment-too-early",
    title: "Early payment request should not jump straight to payment",
    leadSourceLeadId: "pilot-lead-005",
    inboundMessage: "Can you send the payment link directly now?",
    expectedRoute: "reply",
    forbiddenTools: ["get_or_create_payment_link"],
    notes: "The AI should keep the user in the form flow first.",
    mockResponses: [
      makeMockReplyResponse({
        assistant_message:
          "We will share the payment link after the admission form step is completed for the selected branch. If you want, I can send the admission form link first and help you move to payment after that.",
        crm_note: "Blocked early payment jump and redirected to form step.",
        follow_up_needed: true,
      }),
    ],
  },
  {
    id: "branch-selection-without-default",
    title: "No selected branch still supports callback from recommendation context",
    leadSourceLeadId: "pilot-lead-005",
    inboundMessage: "Kukatpally branch looks good. Can someone call and explain hostel options?",
    expectedRoute: "reply",
    expectedTools: ["assign_preferred_branch", "request_callback"],
    contextOverride: {
      lead: {
        assigned_branch_id: null,
        preferred_branch_id: null,
      },
      selectedBranch: null,
      recentMessages: [
        makeConversation("dryrun-outbound-1", branchSelectionLead.id, "outbound", "Here are the best options for your child."),
        makeConversation("dryrun-inbound-1", branchSelectionLead.id, "inbound", "Kukatpally branch looks good. Can someone call and explain hostel options?"),
      ],
    },
    mockResponses: [
      makeMockFunctionCallResponse([
        {
          name: "assign_preferred_branch",
          arguments: {
            lead_id: branchSelectionLead.id,
            branch_id: kukatpallyBranchId,
          },
        },
        {
          name: "request_callback",
          arguments: {
            lead_id: branchSelectionLead.id,
            branch_id: kukatpallyBranchId,
            reason: "Parent picked Kukatpally and wants a human explanation of hostel options.",
          },
        },
      ]),
      makeMockReplyResponse({
        assistant_message:
          "I have marked Kukatpally as your preferred branch and asked our counselor to call you about hostel options. They will confirm the callback shortly.",
        crm_note: "Selected branch from recommendation context and created callback task.",
        follow_up_needed: true,
      }),
    ],
  },
];

export function getWhatsAppAiDryRunScenario(id: string) {
  return whatsappAiDryRunScenarios.find((scenario) => scenario.id === id) ?? null;
}

export function getScenarioLeadBySourceLeadId(sourceLeadId: string) {
  return findLeadBySourceLeadId(sourceLeadId);
}
