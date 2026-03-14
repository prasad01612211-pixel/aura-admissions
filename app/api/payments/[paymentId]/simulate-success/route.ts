import { NextResponse } from "next/server";

import { markPaymentSuccessful } from "@/lib/admission/service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ paymentId: string }> },
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Simulation is disabled in production." }, { status: 405 });
  }

  try {
    const { paymentId } = await context.params;
    const result = await markPaymentSuccessful({
      paymentId,
      gatewayPaymentId: `devpay_${paymentId.replace(/-/g, "").slice(0, 16)}`,
      webhookPayload: {
        simulated: true,
        source: "local_dev",
      },
    });

    return NextResponse.json({
      ok: true,
      idempotent: result.idempotent,
      payment_id: result.payment.id,
      lead_id: result.lead?.id ?? null,
      stage: result.lead?.stage ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to simulate payment success.",
      },
      { status: 400 },
    );
  }
}
