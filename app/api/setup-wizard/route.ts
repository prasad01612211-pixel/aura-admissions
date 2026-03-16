import { NextResponse } from "next/server";
import { z } from "zod";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
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
  try {
    await requireApiOperator(["admin", "operations"]);
    const { searchParams } = new URL(request.url);
    const snapshot = await getSetupWizardSnapshot({
      organizationId: searchParams.get("organizationId") ?? undefined,
      institutionId: searchParams.get("institutionId") ?? undefined,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    return operatorErrorResponse(error, "Unable to load setup wizard.");
  }
}

export async function POST(request: Request) {
  try {
    await requireApiOperator(["admin", "operations"]);
    const payload = saveSchema.parse(await request.json());
    const draft = await saveSetupWizardDraft(payload);
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    return operatorErrorResponse(error, "Unable to save setup draft.");
  }
}

export async function PATCH(request: Request) {
  try {
    await requireApiOperator(["admin", "operations"]);
    const payload = publishSchema.parse(await request.json());
    const draft = await publishSetupWizard(payload);
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    return operatorErrorResponse(error, "Unable to publish setup.");
  }
}
