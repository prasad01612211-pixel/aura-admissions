import { NextResponse } from "next/server";
import { z } from "zod";

import { dispatchWhatsAppCampaign } from "@/lib/whatsapp/service";
import { whatsappTemplateNames } from "@/lib/whatsapp/templates";

const requestSchema = z.object({
  campaignId: z.string().uuid().optional().nullable(),
  name: z.string().trim().optional(),
  templateName: z.enum(whatsappTemplateNames),
  limit: z.number().int().min(1).max(250).optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const result = await dispatchWhatsAppCampaign({
      campaignId: payload.campaignId ?? null,
      name: payload.name,
      templateName: payload.templateName,
      limit: payload.limit,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to dispatch campaign.",
      },
      { status: 400 },
    );
  }
}
