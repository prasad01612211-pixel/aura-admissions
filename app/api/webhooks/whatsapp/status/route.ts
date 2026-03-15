import { NextResponse } from "next/server";

import { validateWhatsAppWebhookSignature } from "@/lib/whatsapp/provider";
import { handleWhatsAppStatus } from "@/lib/whatsapp/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const signatureValidation = validateWhatsAppWebhookSignature(body, signature);

  if (!signatureValidation.ok) {
    return NextResponse.json({ error: signatureValidation.reason }, { status: signatureValidation.status });
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
