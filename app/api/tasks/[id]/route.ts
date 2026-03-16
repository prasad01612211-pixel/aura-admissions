import { NextResponse } from "next/server";
import { z } from "zod";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { readRuntimeTasks, upsertRuntimeTask } from "@/lib/runtime/store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Task } from "@/types/domain";

const patchSchema = z.object({
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireApiOperator(["admin", "counselor", "operations"]);
    const { id } = await context.params;
    const payload = patchSchema.parse(await request.json());
    const supabase = createAdminSupabaseClient();

    if (!supabase) {
      const rows = await readRuntimeTasks();
      const current = rows.find((task) => task.id === id);
      if (!current) {
        return NextResponse.json({ error: "Task not found." }, { status: 404 });
      }

      const nextTask: Task = {
        ...current,
        status: payload.status ?? current.status,
        assigned_to: payload.assignedTo === undefined ? current.assigned_to : payload.assignedTo,
        due_at: payload.dueAt === undefined ? current.due_at : payload.dueAt,
        notes: payload.notes === undefined ? current.notes : payload.notes,
        updated_at: new Date().toISOString(),
      };

      await upsertRuntimeTask(nextTask);
      return NextResponse.json({ ok: true, task: nextTask });
    }

    const { data } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
    if (!data) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const current = data as Task;
    const nextTask: Task = {
      ...current,
      status: payload.status ?? current.status,
      assigned_to: payload.assignedTo === undefined ? current.assigned_to : payload.assignedTo,
      due_at: payload.dueAt === undefined ? current.due_at : payload.dueAt,
      notes: payload.notes === undefined ? current.notes : payload.notes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("tasks").upsert(nextTask as never);
    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, task: nextTask });
  } catch (error) {
    return operatorErrorResponse(error, "Unable to update the task.");
  }
}
