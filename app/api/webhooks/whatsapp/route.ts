import { NextResponse } from "next/server";

import { validateWhatsAppWebhookSignature } from "@/lib/whatsapp/provider";
import {
  getWhatsAppWebhookVerificationResponse,
  handleWhatsAppInbound,
  handleWhatsAppStatus,
} from "@/lib/whatsapp/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = getWhatsAppWebhookVerificationResponse(url.searchParams);

  if (!challenge) {
    return NextResponse.json({ error: "Invalid webhook verification request." }, { status: 403 });
  }

  return new Response(challenge, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const signatureValidation = validateWhatsAppWebhookSignature(body, signature);

  if (!signatureValidation.ok) {
    return NextResponse.json({ error: signatureValidation.reason }, { status: signatureValidation.status });
  }

  try {
    const payload = JSON.parse(body) as Record<string, unknown>;
    const [inbound, status] = await Promise.all([
      handleWhatsAppInbound(payload),
      handleWhatsAppStatus(payload),
    ]);

    return NextResponse.json({
      ok: true,
      inbound,
      status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "WhatsApp webhook processing failed.",
      },
      { status: 400 },
    );
  }
}
