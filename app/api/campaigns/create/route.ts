import { NextResponse } from "next/server";
import { z } from "zod";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { createWhatsAppCampaign } from "@/lib/whatsapp/service";
import { whatsappTemplateNames } from "@/lib/whatsapp/templates";

const requestSchema = z.object({
  name: z.string().trim().min(4),
  templateName: z.enum(whatsappTemplateNames),
  sourceBatch: z.string().trim().optional().nullable(),
  targetCount: z.number().int().positive(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireApiOperator(["admin", "operations"]);
    const payload = requestSchema.parse(await request.json());
    const campaign = await createWhatsAppCampaign({
      name: payload.name,
      templateName: payload.templateName,
      sourceBatch: payload.sourceBatch ?? null,
      targetCount: payload.targetCount,
    });

    return NextResponse.json({
      ok: true,
      campaign,
    });
  } catch (error) {
    return operatorErrorResponse(error, "Unable to create campaign.");
  }
}
