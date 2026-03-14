import { NextResponse } from "next/server";

import { verifyWhatsAppWebhookSignature } from "@/lib/whatsapp/provider";
import { handleWhatsAppStatus } from "@/lib/whatsapp/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid WhatsApp webhook signature." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(body) as Record<string, unknown>;
    const status = await handleWhatsAppStatus(payload);

    return NextResponse.json({
      ok: true,
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "WhatsApp status webhook processing failed.",
      },
      { status: 400 },
    );
  }
}
