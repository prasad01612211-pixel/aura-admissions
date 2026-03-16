import { NextResponse } from "next/server";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { getCommunicationSettings } from "@/lib/operations/settings";
import { getWhatsAppProviderStatus } from "@/lib/whatsapp/provider";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiOperator(["admin", "operations"]);
    const settings = await getCommunicationSettings();

    return NextResponse.json({
      ok: true,
      ...getWhatsAppProviderStatus(),
      guardrails: {
        sandbox_mode: settings.sandbox_mode,
        whatsapp_enabled: settings.whatsapp_enabled,
        business_hours_start: settings.business_hours_start,
        business_hours_end: settings.business_hours_end,
        timezone: settings.timezone,
        rate_limit_per_minute: settings.rate_limit_per_minute,
        retry_limit: settings.retry_limit,
        seat_lock_enabled: settings.seat_lock_enabled,
      },
    });
  } catch (error) {
    return operatorErrorResponse(error, "Unable to load WhatsApp status.");
  }
}
