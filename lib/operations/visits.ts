import "server-only";

import { randomUUID } from "crypto";

import { visitBookings as fixtureVisitBookings } from "@/lib/fixtures/operations-data";
import { readRuntimeVisitBookings, upsertRuntimeVisitBooking } from "@/lib/runtime/ops-store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { VisitBooking, VisitBookingStatus, VisitOutcomeStatus } from "@/types/operations";

function mergeById<T extends { id: string }>(rows: T[]) {
  const map = new Map<string, T>();
  rows.forEach((row) => map.set(row.id, row));
  return [...map.values()];
}

export async function getVisitBookings(): Promise<VisitBooking[]> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return mergeById([...fixtureVisitBookings, ...(await readRuntimeVisitBookings())]).sort((left, right) =>
      right.scheduled_for.localeCompare(left.scheduled_for),
    );
  }

  const { data } = await supabase.from("visit_bookings").select("*").order("scheduled_for", { ascending: false });
  return (data ?? []) as VisitBooking[];
}

export async function saveVisitBooking(booking: VisitBooking) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return upsertRuntimeVisitBooking(booking);
  }

  const { error } = await supabase.from("visit_bookings").upsert(booking as never);
  if (error) {
    throw new Error(error.message);
  }

  return booking;
}

export async function createVisitBooking(args: {
  lead_id: string;
  branch_id: string;
  scheduled_for: string;
  attendee_count?: number;
  notes?: string | null;
  status?: VisitBookingStatus;
}) {
  const now = new Date().toISOString();
  return saveVisitBooking({
    id: randomUUID(),
    lead_id: args.lead_id,
    branch_id: args.branch_id,
    scheduled_for: args.scheduled_for,
    attendee_count: args.attendee_count ?? 1,
    notes: args.notes ?? null,
    status: args.status ?? "proposed",
    outcome_status: null,
    created_at: now,
    updated_at: now,
  });
}

export async function updateVisitBooking(args: {
  id: string;
  status?: VisitBookingStatus;
  outcome_status?: VisitOutcomeStatus | null;
  scheduled_for?: string;
  notes?: string | null;
}) {
  const bookings = await getVisitBookings();
  const current = bookings.find((booking) => booking.id === args.id);
  if (!current) {
    throw new Error("Visit booking not found.");
  }

  return saveVisitBooking({
    ...current,
    status: args.status ?? current.status,
    outcome_status: args.outcome_status ?? current.outcome_status,
    scheduled_for: args.scheduled_for ?? current.scheduled_for,
    notes: args.notes === undefined ? current.notes : args.notes,
    updated_at: new Date().toISOString(),
  });
}
