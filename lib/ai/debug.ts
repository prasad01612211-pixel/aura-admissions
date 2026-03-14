import type { LeadEvent } from "@/types/domain";

export interface LeadAiTrace {
  id: string;
  createdAt: string;
  eventType: string;
  eventSource: string;
  model: string | null;
  route: string | null;
  confidence: number | null;
  languageCode: string | null;
  crmNote: string | null;
  followUpNeeded: boolean | null;
  error: string | null;
  reason: string | null;
  escalationReason: string | null;
  promptVersion: string | null;
  toolTraces: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result: Record<string, unknown>;
  }>;
}

function parseToolTraces(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const trace = item as {
        name?: unknown;
        arguments?: unknown;
        result?: unknown;
      };

      return {
        name: typeof trace.name === "string" ? trace.name : "unknown",
        arguments: trace.arguments && typeof trace.arguments === "object" ? (trace.arguments as Record<string, unknown>) : {},
        result: trace.result && typeof trace.result === "object" ? (trace.result as Record<string, unknown>) : {},
      };
    });
}

export function getLeadAiTraces(events: LeadEvent[]): LeadAiTrace[] {
  return events
    .filter((event) => event.event_source === "ai_bot" || event.event_type.startsWith("ai_"))
    .map((event) => {
      const payload = event.payload ?? {};
      return {
        id: event.id,
        createdAt: event.created_at,
        eventType: event.event_type,
        eventSource: event.event_source,
        model: typeof payload.model === "string" ? payload.model : null,
        route: typeof payload.route === "string" ? payload.route : null,
        confidence: typeof payload.confidence === "number" ? payload.confidence : null,
        languageCode: typeof payload.language_code === "string" ? payload.language_code : null,
        crmNote: typeof payload.crm_note === "string" ? payload.crm_note : null,
        followUpNeeded: typeof payload.follow_up_needed === "boolean" ? payload.follow_up_needed : null,
        error: typeof payload.error === "string" ? payload.error : null,
        reason: typeof payload.reason === "string" ? payload.reason : null,
        escalationReason: typeof payload.escalation_reason === "string" ? payload.escalation_reason : null,
        promptVersion: typeof payload.prompt_version === "string" ? payload.prompt_version : null,
        toolTraces: parseToolTraces(payload.tool_traces),
      };
    });
}
