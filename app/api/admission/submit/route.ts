import { NextResponse } from "next/server";
import { z } from "zod";

import { submitAdmissionForm } from "@/lib/admission/service";

const phoneSchema = z.string().trim().min(10).max(16);

const admissionFormSchema = z.object({
  leadId: z.string().min(1),
  branchId: z.string().min(1),
  studentName: z.string().trim().min(2),
  fatherName: z.string().trim().optional().nullable(),
  motherName: z.string().trim().optional().nullable(),
  parentPhone: phoneSchema,
  studentPhone: phoneSchema.optional().nullable(),
  address: z.string().trim().min(8),
  district: z.string().trim().min(2),
  courseSelected: z.string().trim().min(2),
  hostelRequired: z.boolean(),
  marks10th: z.number().min(0).max(10).optional().nullable(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = admissionFormSchema.parse(await request.json());
    const result = await submitAdmissionForm(payload);

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
        error: error instanceof Error ? error.message : "Admission form submission failed.",
      },
      { status: 400 },
    );
  }
}
