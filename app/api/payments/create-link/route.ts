import { NextResponse } from "next/server";
import { z } from "zod";

import { createSeatLockPayment, getBranchForWorkflow, getLeadForWorkflow } from "@/lib/admission/service";

const paymentLinkSchema = z.object({
  leadId: z.string().min(1),
  branchId: z.string().min(1),
  amount: z.number().positive().optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = paymentLinkSchema.parse(await request.json());
    const leadRecord = await getLeadForWorkflow(payload.leadId);

    if (!leadRecord) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const branch = await getBranchForWorkflow(payload.branchId);
    const result = await createSeatLockPayment({
      lead: leadRecord.lead,
      branch,
      source: leadRecord.source,
      amount: payload.amount,
    });

    return NextResponse.json({
      ok: true,
      lead_id: result.lead.id,
      payment_id: result.payment.id,
      checkout_url: result.checkout_url,
      stage: result.lead.stage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create payment link.",
      },
      { status: 400 },
    );
  }
}
