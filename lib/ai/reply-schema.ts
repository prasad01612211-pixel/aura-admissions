export type WhatsAppAiRoute = "reply" | "escalate" | "stop";

export interface WhatsAppAiStructuredReply {
  assistant_message: string;
  language_code: string;
  route: WhatsAppAiRoute;
  confidence: number;
  crm_note: string;
  follow_up_needed: boolean;
}

export const whatsappAiReplySchema = {
  type: "json_schema",
  name: "whatsapp_ai_reply",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      assistant_message: {
        type: "string",
        description: "The WhatsApp-safe reply to send to the parent.",
      },
      language_code: {
        type: "string",
        description: "The language used for the reply, such as en, hi, or te.",
      },
      route: {
        type: "string",
        enum: ["reply", "escalate", "stop"],
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      crm_note: {
        type: "string",
        description: "A short internal note for the admissions team.",
      },
      follow_up_needed: {
        type: "boolean",
      },
    },
    required: [
      "assistant_message",
      "language_code",
      "route",
      "confidence",
      "crm_note",
      "follow_up_needed",
    ],
  },
} as const;

export function parseWhatsAppAiStructuredReply(value: string): WhatsAppAiStructuredReply | null {
  try {
    const parsed = JSON.parse(value) as Partial<WhatsAppAiStructuredReply>;
    if (
      typeof parsed.assistant_message !== "string" ||
      typeof parsed.language_code !== "string" ||
      (parsed.route !== "reply" && parsed.route !== "escalate" && parsed.route !== "stop") ||
      typeof parsed.confidence !== "number" ||
      typeof parsed.crm_note !== "string" ||
      typeof parsed.follow_up_needed !== "boolean"
    ) {
      return null;
    }
    return parsed as WhatsAppAiStructuredReply;
  } catch {
    return null;
  }
}
