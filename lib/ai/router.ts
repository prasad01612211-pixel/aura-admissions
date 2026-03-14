import "server-only";

import { getAiWhatsAppRolloutPercent, isAiWhatsAppEnabled, isOpenAiConfigured, serverEnv } from "@/lib/env";
import {
  createOpenAiResponse,
  extractOpenAiFunctionCalls,
  extractOpenAiOutputText,
  getOpenAiResponseId,
} from "@/lib/ai/client";
import { buildWhatsAppAiContext } from "@/lib/ai/context";
import { detectForcedEscalationReason } from "@/lib/ai/escalation";
import { parseWhatsAppAiStructuredReply, whatsappAiReplySchema } from "@/lib/ai/reply-schema";
import { buildWhatsAppAgentInput, buildWhatsAppAgentInstructions, whatsappAgentPromptVersion } from "@/lib/ai/prompts/whatsapp";
import { executeWhatsAppAiToolCall, getAllowedWhatsAppAiToolNames, getWhatsAppAiToolDefinitions } from "@/lib/ai/tools";
import type {
  WhatsAppAiContext,
  WhatsAppAiContextOverride,
  WhatsAppAiDecision,
  WhatsAppAiMockResponse,
  WhatsAppAiToolTrace,
} from "@/lib/ai/types";
import type { Lead } from "@/types/domain";
import type { ObjectionSeverity } from "@/types/operations";

function buildMockOpenAiPayload(response: WhatsAppAiMockResponse, attempt: number): Record<string, unknown> {
  const output: Record<string, unknown>[] = [];

  if (Array.isArray(response.functionCalls)) {
    response.functionCalls.forEach((functionCall, index) => {
      output.push({
        type: "function_call",
        name: functionCall.name,
        call_id: `mock-call-${attempt + 1}-${index + 1}`,
        arguments: JSON.stringify(functionCall.arguments),
      });
    });
  }

  if (typeof response.outputText === "string" && response.outputText.trim().length > 0) {
    output.push({
      type: "message",
      content: [
        {
          type: "output_text",
          text: response.outputText,
        },
      ],
    });
  }

  return {
    id: response.id ?? `mock-response-${attempt + 1}`,
    output,
    output_text: response.outputText ?? null,
  };
}

function isLeadInRollout(leadId: string) {
  const rolloutPercent = getAiWhatsAppRolloutPercent();
  if (rolloutPercent >= 100) {
    return true;
  }
  if (rolloutPercent <= 0) {
    return false;
  }

  let hash = 0;
  for (const character of leadId) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1000;
  }

  return hash % 100 < rolloutPercent;
}

function looksLikeSimpleCommand(text: string) {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  return [
    "yes",
    "ok",
    "okay",
    "show",
    "show options",
    "call",
    "counselor",
    "visit",
    "apply",
    "payment",
    "paid",
    "no",
    "stop",
    "1",
    "2",
    "3",
  ].includes(normalized);
}

export function shouldAttemptInboundWhatsAppAi(args: {
  lead: Lead;
  message: string;
  missingQualificationStep: string | null;
  objectionSeverity: ObjectionSeverity | null;
}) {
  if (!isAiWhatsAppEnabled() || !isOpenAiConfigured) {
    return false;
  }

  if (!isLeadInRollout(args.lead.id)) {
    return false;
  }

  if (args.missingQualificationStep) {
    return false;
  }

  if (looksLikeSimpleCommand(args.message)) {
    return false;
  }

  if (args.objectionSeverity === "high") {
    return true;
  }

  const normalized = args.message.toLowerCase();
  if (/[^\u0000-\u007F]/.test(args.message)) {
    return true;
  }

  if (args.message.length >= 40 || args.message.includes("?") || args.message.includes("\n")) {
    return true;
  }

  return ["fee", "hostel", "refund", "scholarship", "location", "payment", "confused", "help"].some((term) =>
    normalized.includes(term),
  );
}

export async function tryHandleInboundWhatsAppWithAi(args: {
  leadId: string;
  phone: string;
  message: string;
  objectionSeverity?: ObjectionSeverity | null;
  dryRun?: boolean;
  force?: boolean;
  contextOverride?: WhatsAppAiContextOverride;
  mockResponses?: WhatsAppAiMockResponse[];
}): Promise<WhatsAppAiDecision> {
  if (!args.force && !isAiWhatsAppEnabled()) {
    return {
      handled: false,
      reason: "disabled",
    };
  }

  const baseContext = await buildWhatsAppAiContext({
    leadId: args.leadId,
    phone: args.phone,
    inboundMessage: args.message,
    objectionSeverity: args.objectionSeverity ?? null,
  });

  if (!baseContext) {
    return {
      handled: false,
      reason: "missing_context",
    };
  }

  const context: WhatsAppAiContext = {
    ...baseContext,
    ...args.contextOverride,
    lead: {
      ...baseContext.lead,
      ...(args.contextOverride?.lead ?? {}),
    },
    inboundMessage: args.contextOverride?.inboundMessage ?? baseContext.inboundMessage,
    recentMessages: args.contextOverride?.recentMessages ?? baseContext.recentMessages,
    selectedBranch:
      args.contextOverride?.selectedBranch === undefined ? baseContext.selectedBranch : args.contextOverride.selectedBranch,
    recommendations: args.contextOverride?.recommendations ?? baseContext.recommendations,
    payments: args.contextOverride?.payments ?? baseContext.payments,
    openTasks: args.contextOverride?.openTasks ?? baseContext.openTasks,
    form: args.contextOverride?.form === undefined ? baseContext.form : args.contextOverride.form,
    objectionSeverity: args.contextOverride?.objectionSeverity ?? baseContext.objectionSeverity,
  };

  const toolTraces: WhatsAppAiToolTrace[] = [];
  const mockResponses = args.mockResponses ? [...args.mockResponses] : [];
  const usingMockResponses = mockResponses.length > 0;
  const forcedEscalationReason = detectForcedEscalationReason({
    lead: context.lead,
    message: args.message,
    objectionSeverity: context.objectionSeverity,
  });

  if (forcedEscalationReason) {
    const escalation = await executeWhatsAppAiToolCall({
      name: "escalate_to_human",
      rawArguments: JSON.stringify({
        lead_id: context.lead.id,
        branch_id: context.selectedBranch?.id ?? null,
        task_type: forcedEscalationReason.toLowerCase().includes("payment") ? "payment_followup" : "closure",
        priority: "urgent",
        notes: forcedEscalationReason,
      }),
      context,
      dryRun: args.dryRun,
    });

    toolTraces.push({
      name: "escalate_to_human",
      arguments: escalation.arguments,
      result: escalation.result,
    });

    return {
      handled: true,
      replyText: "I have flagged this for our admissions team so a human can take over shortly.",
      eventType: "ai_human_escalation_sent",
      payload: {
        prompt_version: whatsappAgentPromptVersion,
        route: "escalate",
        confidence: 1,
        model: serverEnv.OPENAI_MODEL_CHAT ?? "gpt-5-mini",
        tool_traces: toolTraces,
        escalation_reason: forcedEscalationReason,
        dry_run: args.dryRun ?? false,
        mock_run: usingMockResponses,
      },
    };
  }

  if (!isOpenAiConfigured && !usingMockResponses) {
    return {
      handled: false,
      reason: "model_unavailable",
      error: "OPENAI_API_KEY is missing or placeholder-only.",
    };
  }

  try {
    const allowedToolNames = getAllowedWhatsAppAiToolNames(context);
    const instructions = buildWhatsAppAgentInstructions({
      context,
      allowedTools: allowedToolNames,
    });
    const tools = getWhatsAppAiToolDefinitions(context);
    let previousResponseId: string | null = null;
    let input: unknown = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildWhatsAppAgentInput({
              context,
              allowedTools: allowedToolNames,
            }),
          },
        ],
      },
    ];

    const maxAttempts = usingMockResponses ? Math.max(mockResponses.length, 1) : 3;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = usingMockResponses
        ? (() => {
            const nextResponse = mockResponses.shift();
            if (!nextResponse) {
              throw new Error("Mock response queue exhausted before the AI agent produced a final reply.");
            }
            return buildMockOpenAiPayload(nextResponse, attempt);
          })()
        : await createOpenAiResponse({
            instructions,
            input,
            tools,
            previousResponseId,
            responseFormat: whatsappAiReplySchema,
          });

      const functionCalls = extractOpenAiFunctionCalls(response);
      if (functionCalls.length > 0) {
        const toolOutputs = [];

        for (const functionCall of functionCalls) {
          const execution = await executeWhatsAppAiToolCall({
            name: functionCall.name,
            rawArguments: functionCall.arguments,
            context,
            dryRun: args.dryRun,
          });

          toolTraces.push({
            name: functionCall.name,
            arguments: execution.arguments,
            result: execution.result,
          });

          toolOutputs.push({
            type: "function_call_output",
            call_id: functionCall.callId,
            output: JSON.stringify(execution.result),
          });
        }

        previousResponseId = getOpenAiResponseId(response);
        input = toolOutputs;
        continue;
      }

      const outputText = extractOpenAiOutputText(response);
      if (!outputText) {
        break;
      }

      const structuredReply =
        parseWhatsAppAiStructuredReply(outputText) ??
        ({
          assistant_message: outputText.trim(),
          language_code: context.lead.preferred_language ?? "en",
          route: "reply",
          confidence: 0.4,
          crm_note: "Model returned unstructured output.",
          follow_up_needed: false,
        } as const);

      if (structuredReply.route === "escalate" && !toolTraces.some((trace) => trace.name === "escalate_to_human")) {
        const escalation = await executeWhatsAppAiToolCall({
          name: "escalate_to_human",
          rawArguments: JSON.stringify({
            lead_id: context.lead.id,
            branch_id: context.selectedBranch?.id ?? null,
            task_type: context.lead.stage === "payment_pending" ? "payment_followup" : "closure",
            priority: context.lead.status === "hot" ? "urgent" : "high",
            notes: structuredReply.crm_note,
          }),
          context,
          dryRun: args.dryRun,
        });

        toolTraces.push({
          name: "escalate_to_human",
          arguments: escalation.arguments,
          result: escalation.result,
        });
      }

      if (structuredReply.route === "stop" && !toolTraces.some((trace) => trace.name === "mark_not_interested")) {
        const markLost = await executeWhatsAppAiToolCall({
          name: "mark_not_interested",
          rawArguments: JSON.stringify({
            lead_id: context.lead.id,
            reason: structuredReply.crm_note,
          }),
          context,
          dryRun: args.dryRun,
        });

        toolTraces.push({
          name: "mark_not_interested",
          arguments: markLost.arguments,
          result: markLost.result,
        });
      }

      return {
        handled: true,
        replyText: structuredReply.assistant_message,
        eventType:
          structuredReply.route === "escalate"
            ? "ai_human_escalation_sent"
            : structuredReply.route === "stop"
              ? "ai_stop_reply_sent"
              : "ai_reply_sent",
        payload: {
          prompt_version: whatsappAgentPromptVersion,
          route: structuredReply.route,
          confidence: structuredReply.confidence,
          crm_note: structuredReply.crm_note,
          follow_up_needed: structuredReply.follow_up_needed,
          language_code: structuredReply.language_code,
          model: serverEnv.OPENAI_MODEL_CHAT ?? "gpt-5-mini",
          tool_traces: toolTraces,
          dry_run: args.dryRun ?? false,
          mock_run: usingMockResponses,
        },
      };
    }

    return {
      handled: false,
      reason: "no_final_reply",
    };
  } catch (error) {
    return {
      handled: false,
      reason: "error",
      error: error instanceof Error ? error.message : "Unknown AI routing error.",
    };
  }
}
