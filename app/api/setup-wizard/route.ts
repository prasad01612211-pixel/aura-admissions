import { NextResponse } from "next/server";
import { z } from "zod";

import { getSetupWizardSnapshot, publishSetupWizard, saveSetupWizardDraft } from "@/lib/operations/setup";
import { setupWizardStepKeys } from "@/types/operations";

const saveSchema = z.object({
  organizationId: z.string().uuid().nullable().optional(),
  institutionId: z.string().uuid().nullable().optional(),
  stepKey: z.enum(setupWizardStepKeys),
  draftPayload: z.record(z.string(), z.unknown()),
  completedSteps: z.array(z.enum(setupWizardStepKeys)),
});

const publishSchema = z.object({
  organizationId: z.string().uuid().nullable().optional(),
  institutionId: z.string().uuid().nullable().optional(),
  completedSteps: z.array(z.enum(setupWizardStepKeys)),
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const snapshot = await getSetupWizardSnapshot({
    organizationId: searchParams.get("organizationId") ?? undefined,
    institutionId: searchParams.get("institutionId") ?? undefined,
  });

  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  try {
    const payload = saveSchema.parse(await request.json());
    const draft = await saveSetupWizardDraft(payload);
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save setup draft." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = publishSchema.parse(await request.json());
    const draft = await publishSetupWizard(payload);
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish setup." },
      { status: 400 },
    );
  }
}
