import "server-only";

import { getAiResponseTimeoutMs, isOpenAiConfigured, serverEnv } from "@/lib/env";

export interface OpenAiToolDefinition {
  type: "function";
  name: string;
  description: string;
  strict: boolean;
  parameters: Record<string, unknown>;
}

export interface OpenAiResponseFormat {
  type: "json_schema";
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
}

export async function createOpenAiResponse(args: {
  instructions: string;
  input: unknown;
  tools?: OpenAiToolDefinition[];
  previousResponseId?: string | null;
  responseFormat?: OpenAiResponseFormat;
}) {
  if (!isOpenAiConfigured || !serverEnv.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing or placeholder-only.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getAiResponseTimeoutMs());

  try {
    const body: Record<string, unknown> = {
      model: serverEnv.OPENAI_MODEL_CHAT ?? "gpt-5-mini",
      instructions: args.instructions,
      input: args.input,
    };

    if (args.tools && args.tools.length > 0) {
      body.tools = args.tools;
      body.tool_choice = "auto";
      body.parallel_tool_calls = false;
    }

    if (args.previousResponseId) {
      body.previous_response_id = args.previousResponseId;
    }

    if (args.responseFormat) {
      body.text = {
        format: args.responseFormat,
      };
    }

    const response = await fetch(`${serverEnv.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(
        `OpenAI Responses API request failed${payload.error && typeof payload.error === "object" ? `: ${JSON.stringify(payload.error)}` : "."}`,
      );
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export function getOpenAiResponseId(payload: Record<string, unknown>) {
  return typeof payload.id === "string" ? payload.id : null;
}

export function extractOpenAiFunctionCalls(payload: Record<string, unknown>) {
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output
    .filter((item) => item && typeof item === "object" && (item as { type?: string }).type === "function_call")
    .map((item) => {
      const functionCall = item as {
        type: "function_call";
        name?: string;
        call_id?: string;
        arguments?: string;
      };

      return {
        name: functionCall.name ?? "",
        callId: functionCall.call_id ?? "",
        arguments: functionCall.arguments ?? "{}",
      };
    })
    .filter((item) => item.name && item.callId);
}

export function extractOpenAiOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];
    for (const entry of content) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const textValue =
        typeof (entry as { text?: unknown }).text === "string"
          ? (entry as { text: string }).text
          : typeof (entry as { value?: unknown }).value === "string"
            ? (entry as { value: string }).value
            : null;

      if (textValue && textValue.trim().length > 0) {
        return textValue;
      }
    }
  }

  return null;
}
