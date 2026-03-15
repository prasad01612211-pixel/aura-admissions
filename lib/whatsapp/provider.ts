import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";

import { isWhatsAppCloudConfigured, serverEnv } from "@/lib/env";
import { renderWhatsAppTemplate, type WhatsAppTemplateName, type WhatsAppTemplateVariables } from "@/lib/whatsapp/templates";

export type WhatsAppProviderMode = "mock" | "cloud_api";

export interface WhatsAppSendResult {
  provider_message_id: string;
  delivery_status: "queued" | "sent";
  preview_text: string;
  raw_response: Record<string, unknown>;
}

type WhatsAppWebhookSignatureValidation =
  | { ok: true }
  | { ok: false; reason: string; status: 401 | 503 };

function getProviderMode(): WhatsAppProviderMode {
  if (serverEnv.WHATSAPP_PROVIDER === "cloud_api" && isWhatsAppCloudConfigured) {
    return "cloud_api";
  }

  return "mock";
}

function buildMockResult(previewText: string): WhatsAppSendResult {
  return {
    provider_message_id: `mock-${randomUUID()}`,
    delivery_status: "sent",
    preview_text: previewText,
    raw_response: {
      provider: "mock",
      preview_text: previewText,
    },
  };
}

async function sendCloudApiRequest(body: Record<string, unknown>) {
  const graphVersion = serverEnv.WHATSAPP_GRAPH_VERSION ?? "v23.0";
  const phoneNumberId = serverEnv.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = serverEnv.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp Cloud API credentials are missing.");
  }

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      `WhatsApp Cloud API request failed${payload.error && typeof payload.error === "object" ? `: ${JSON.stringify(payload.error)}` : "."}`,
    );
  }

  const providerMessageId =
    Array.isArray(payload.messages) && payload.messages[0] && typeof payload.messages[0] === "object"
      ? String((payload.messages[0] as { id?: string }).id ?? `wamid.${randomUUID()}`)
      : `wamid.${randomUUID()}`;

  return {
    provider_message_id: providerMessageId,
    delivery_status: "sent" as const,
    raw_response: payload,
  };
}

export async function sendWhatsAppTemplateMessage(args: {
  to: string;
  templateName: WhatsAppTemplateName;
  variables?: WhatsAppTemplateVariables;
  languageCode?: string;
}) {
  const previewText = renderWhatsAppTemplate(args.templateName, args.variables);
  const providerMode = getProviderMode();

  if (providerMode === "mock") {
    return buildMockResult(previewText);
  }

  const variableValues = Object.values(args.variables ?? {}).filter((value) => value !== undefined && value !== null);
  const result = await sendCloudApiRequest({
    messaging_product: "whatsapp",
    to: args.to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: args.templateName,
      language: {
        code: args.languageCode ?? "en",
      },
      ...(variableValues.length > 0
        ? {
            components: [
              {
                type: "body",
                parameters: variableValues.map((value) => ({
                  type: "text",
                  text: String(value),
                })),
              },
            ],
          }
        : {}),
    },
  });

  return {
    ...result,
    preview_text: previewText,
  } satisfies WhatsAppSendResult;
}

export async function sendWhatsAppTextMessage(args: {
  to: string;
  body: string;
}) {
  const providerMode = getProviderMode();

  if (providerMode === "mock") {
    return buildMockResult(args.body);
  }

  const result = await sendCloudApiRequest({
    messaging_product: "whatsapp",
    to: args.to.replace(/^\+/, ""),
    type: "text",
    text: {
      preview_url: false,
      body: args.body,
    },
  });

  return {
    ...result,
    preview_text: args.body,
  } satisfies WhatsAppSendResult;
}

function shouldEnforceWhatsAppWebhookSignature() {
  return process.env.NODE_ENV === "production" || serverEnv.WHATSAPP_PROVIDER === "cloud_api" || isWhatsAppCloudConfigured;
}

export function validateWhatsAppWebhookSignature(
  body: string,
  signatureHeader: string | null,
): WhatsAppWebhookSignatureValidation {
  if (!shouldEnforceWhatsAppWebhookSignature()) {
    return { ok: true };
  }

  if (!serverEnv.WHATSAPP_APP_SECRET) {
    return {
      ok: false,
      reason: "WHATSAPP_APP_SECRET is missing, so webhook signatures cannot be verified.",
      status: 503,
    };
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return {
      ok: false,
      reason: "Missing WhatsApp webhook signature header.",
      status: 401,
    };
  }

  const computed = `sha256=${createHmac("sha256", serverEnv.WHATSAPP_APP_SECRET).update(body).digest("hex")}`;
  const receivedBuffer = Buffer.from(signatureHeader, "utf8");
  const computedBuffer = Buffer.from(computed, "utf8");

  if (receivedBuffer.length !== computedBuffer.length || !timingSafeEqual(receivedBuffer, computedBuffer)) {
    return {
      ok: false,
      reason: "Invalid WhatsApp webhook signature.",
      status: 401,
    };
  }

  return { ok: true };
}

export function verifyWhatsAppWebhookSignature(body: string, signatureHeader: string | null) {
  return validateWhatsAppWebhookSignature(body, signatureHeader).ok;
}

export function getWhatsAppProviderStatus() {
  return {
    mode: getProviderMode(),
    configured: isWhatsAppCloudConfigured,
    app_secret_configured: Boolean(serverEnv.WHATSAPP_APP_SECRET),
    webhook_signature_enforced: shouldEnforceWhatsAppWebhookSignature(),
    business_account_id: serverEnv.WHATSAPP_BUSINESS_ACCOUNT_ID ?? null,
    phone_number_id: serverEnv.WHATSAPP_PHONE_NUMBER_ID ?? null,
  };
}
