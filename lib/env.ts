import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_DB_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_MODEL_CHAT: z.string().min(1).optional(),
  AI_WHATSAPP_ENABLED: z.enum(["true", "false"]).optional(),
  AI_WHATSAPP_ROLLOUT_PERCENT: z.string().min(1).optional(),
  AI_MAX_CONTEXT_TURNS: z.string().min(1).optional(),
  AI_RESPONSE_TIMEOUT_MS: z.string().min(1).optional(),
  WHATSAPP_PROVIDER: z.enum(["mock", "cloud_api"]).optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1).optional(),
  WHATSAPP_APP_SECRET: z.string().min(1).optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1).optional(),
  WHATSAPP_GRAPH_VERSION: z.string().min(1).optional(),
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const serverEnv = serverEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL_CHAT: process.env.OPENAI_MODEL_CHAT,
  AI_WHATSAPP_ENABLED: process.env.AI_WHATSAPP_ENABLED,
  AI_WHATSAPP_ROLLOUT_PERCENT: process.env.AI_WHATSAPP_ROLLOUT_PERCENT,
  AI_MAX_CONTEXT_TURNS: process.env.AI_MAX_CONTEXT_TURNS,
  AI_RESPONSE_TIMEOUT_MS: process.env.AI_RESPONSE_TIMEOUT_MS,
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  WHATSAPP_GRAPH_VERSION: process.env.WHATSAPP_GRAPH_VERSION,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
});

export const isSupabaseConfigured = Boolean(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const isSupabaseAdminConfigured = Boolean(
  isSupabaseConfigured && serverEnv.SUPABASE_SERVICE_ROLE_KEY,
);

export const isWhatsAppCloudConfigured = Boolean(
  serverEnv.WHATSAPP_ACCESS_TOKEN && serverEnv.WHATSAPP_PHONE_NUMBER_ID,
);

function isPlaceholderSecret(value: string | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized.length < 20 ||
    normalized.includes("paste_your") ||
    normalized.includes("your_api_key") ||
    normalized.includes("replace_me") ||
    normalized.includes("example")
  );
}

export const isOpenAiConfigured = Boolean(serverEnv.OPENAI_API_KEY && !isPlaceholderSecret(serverEnv.OPENAI_API_KEY));

export function isAiWhatsAppEnabled() {
  return serverEnv.AI_WHATSAPP_ENABLED === "true" && isOpenAiConfigured;
}

export function getAiWhatsAppRolloutPercent() {
  const value = Number.parseInt(serverEnv.AI_WHATSAPP_ROLLOUT_PERCENT ?? "0", 10);
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
}

export function getAiMaxContextTurns() {
  const value = Number.parseInt(serverEnv.AI_MAX_CONTEXT_TURNS ?? "8", 10);
  if (Number.isNaN(value)) {
    return 8;
  }
  return Math.min(Math.max(value, 1), 20);
}

export function getAiResponseTimeoutMs() {
  const value = Number.parseInt(serverEnv.AI_RESPONSE_TIMEOUT_MS ?? "6000", 10);
  if (Number.isNaN(value)) {
    return 6000;
  }
  return Math.min(Math.max(value, 1000), 30000);
}

export function requireSupabaseAdminEnv() {
  if (!isSupabaseAdminConfigured) {
    throw new Error(
      "Supabase admin credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return {
    url: publicEnv.NEXT_PUBLIC_SUPABASE_URL as string,
    serviceRoleKey: serverEnv.SUPABASE_SERVICE_ROLE_KEY as string,
  };
}
