import { NextResponse } from "next/server";
import { z } from "zod";

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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create campaign.",
      },
      { status: 400 },
    );
  }
}
