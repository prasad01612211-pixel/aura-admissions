import { NextResponse } from "next/server";
import { z } from "zod";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { createVisitBooking, updateVisitBooking } from "@/lib/operations/visits";
import { visitBookingStatuses, visitOutcomeStatuses } from "@/types/operations";

const createSchema = z.object({
  leadId: z.string().uuid(),
  branchId: z.string().uuid(),
  scheduledFor: z.string().datetime(),
  attendeeCount: z.number().int().positive().optional(),
  notes: z.string().trim().nullable().optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(visitBookingStatuses).optional(),
  outcomeStatus: z.enum(visitOutcomeStatuses).nullable().optional(),
  scheduledFor: z.string().datetime().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireApiOperator(["admin", "counselor", "operations"]);
    const payload = createSchema.parse(await request.json());
    const booking = await createVisitBooking({
      lead_id: payload.leadId,
      branch_id: payload.branchId,
      scheduled_for: payload.scheduledFor,
      attendee_count: payload.attendeeCount,
      notes: payload.notes ?? null,
    });

    return NextResponse.json({ ok: true, booking });
  } catch (error) {
    return operatorErrorResponse(error, "Unable to create visit booking.");
  }
}

export async function PATCH(request: Request) {
  try {
    await requireApiOperator(["admin", "counselor", "operations"]);
    const payload = patchSchema.parse(await request.json());
    const booking = await updateVisitBooking({
      id: payload.id,
      status: payload.status,
      outcome_status: payload.outcomeStatus,
      scheduled_for: payload.scheduledFor,
      notes: payload.notes,
    });

    return NextResponse.json({ ok: true, booking });
  } catch (error) {
    return operatorErrorResponse(error, "Unable to update visit booking.");
  }
}
