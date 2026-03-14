import { NextResponse } from "next/server";

import { handleRazorpayWebhook } from "@/lib/admission/service";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature");
    const rawBody = await request.text();

    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid Razorpay webhook signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const result = await handleRazorpayWebhook(payload);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Razorpay webhook failed.",
      },
      { status: 400 },
    );
  }
}
