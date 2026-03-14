import "server-only";

import { getCommunicationSettings } from "@/lib/operations/settings";
import { readRuntimeMessageEvents } from "@/lib/runtime/ops-store";
import type { Lead, LeadOptIn } from "@/types/domain";

type GuardrailDecision =
  | { allowed: true; sandbox_mode: boolean }
  | { allowed: false; reason: string; sandbox_mode: boolean };

function isWithinBusinessHours(now: Date, start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map((value) => Number(value));
  const [endHour, endMinute] = end.split(":").map((value) => Number(value));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export async function evaluateWhatsAppGuardrails(args: {
  lead: Lead;
  optIn?: LeadOptIn | null;
  to: string;
  now?: Date;
}): Promise<GuardrailDecision> {
  const settings = await getCommunicationSettings(args.lead.organization_id ?? undefined);
  const now = args.now ?? new Date();

  if (!settings.whatsapp_enabled) {
    return { allowed: false, reason: "WhatsApp is disabled in admin settings.", sandbox_mode: settings.sandbox_mode };
  }

  if (args.lead.status === "lost" || args.lead.status === "invalid" || args.lead.status === "duplicate") {
    return { allowed: false, reason: "Lead is not eligible for outbound WhatsApp.", sandbox_mode: settings.sandbox_mode };
  }

  if (args.optIn?.status === "opted_out") {
    return { allowed: false, reason: "Lead has opted out of WhatsApp.", sandbox_mode: settings.sandbox_mode };
  }

  if (!isWithinBusinessHours(now, settings.business_hours_start, settings.business_hours_end)) {
    return { allowed: false, reason: "Outside configured business hours.", sandbox_mode: settings.sandbox_mode };
  }

  if (settings.sandbox_mode && settings.sandbox_numbers.length > 0 && !settings.sandbox_numbers.includes(args.to)) {
    return {
      allowed: false,
      reason: "Sandbox mode only allows configured numbers.",
      sandbox_mode: settings.sandbox_mode,
    };
  }

  const recentEvents = (await readRuntimeMessageEvents()).filter((event) => {
    if (event.lead_id !== args.lead.id || event.direction !== "outbound") {
      return false;
    }

    return new Date(event.created_at).getTime() >= now.getTime() - 60 * 1000;
  });

  if (recentEvents.length >= settings.rate_limit_per_minute) {
    return {
      allowed: false,
      reason: "Outbound rate limit reached for the current minute.",
      sandbox_mode: settings.sandbox_mode,
    };
  }

  return { allowed: true, sandbox_mode: settings.sandbox_mode };
}
