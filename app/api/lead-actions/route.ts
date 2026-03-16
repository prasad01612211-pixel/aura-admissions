import { NextResponse } from "next/server";
import { z } from "zod";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import {
  assignLeadOwner,
  createManualTask,
  markLeadCalled,
  requestCampusVisit,
  requestCounselorCallback,
  setLeadOutcome,
} from "@/lib/admission/service";
import { taskPriorities, taskTypes } from "@/types/domain";

const baseSchema = z.object({
  leadId: z.string().uuid(),
});

const requestCallbackSchema = baseSchema.extend({
  type: z.literal("request_callback"),
  branchId: z.string().min(1),
});

const requestVisitSchema = baseSchema.extend({
  type: z.literal("request_visit"),
  branchId: z.string().min(1),
  preferredSlot: z.string().trim().min(4),
});

const markCalledSchema = baseSchema.extend({
  type: z.literal("mark_called"),
  notes: z.string().trim().optional().nullable(),
});

const createTaskSchema = baseSchema.extend({
  type: z.literal("create_task"),
  branchId: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  taskType: z.enum(taskTypes),
  priority: z.enum(taskPriorities),
  dueAt: z.string().datetime().optional().nullable(),
  notes: z.string().trim().min(4),
});

const assignOwnerSchema = baseSchema.extend({
  type: z.literal("assign_owner"),
  ownerUserId: z.string().uuid().optional().nullable(),
});

const markOutcomeSchema = baseSchema.extend({
  type: z.literal("mark_outcome"),
  outcome: z.enum(["won", "lost"]),
});

const actionSchema = z.discriminatedUnion("type", [
  requestCallbackSchema,
  requestVisitSchema,
  markCalledSchema,
  createTaskSchema,
  assignOwnerSchema,
  markOutcomeSchema,
]);

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiOperator(["admin", "counselor", "operations"]);
    const payload = actionSchema.parse(await request.json());

    switch (payload.type) {
      case "request_callback": {
        const result = await requestCounselorCallback({
          leadId: payload.leadId,
          branchId: payload.branchId,
        });

        return NextResponse.json({
          ok: true,
          action: payload.type,
          idempotent: result.idempotent,
          lead_id: result.lead.id,
          stage: result.lead.stage,
          status: result.lead.status,
          task_id: result.task.id,
        });
      }

      case "request_visit": {
        const result = await requestCampusVisit({
          leadId: payload.leadId,
          branchId: payload.branchId,
          preferredSlot: payload.preferredSlot,
        });

        return NextResponse.json({
          ok: true,
          action: payload.type,
          idempotent: result.idempotent,
          lead_id: result.lead.id,
          stage: result.lead.stage,
          status: result.lead.status,
          task_id: result.task.id,
        });
      }

      case "mark_called": {
        const lead = await markLeadCalled({
          leadId: payload.leadId,
          notes: payload.notes ?? null,
        });

        return NextResponse.json({
          ok: true,
          action: payload.type,
          lead_id: lead.id,
          stage: lead.stage,
          status: lead.status,
        });
      }

      case "create_task": {
        const result = await createManualTask({
          leadId: payload.leadId,
          branchId: payload.branchId ?? null,
          assignedTo: payload.assignedTo ?? null,
          taskType: payload.taskType,
          priority: payload.priority,
          dueAt: payload.dueAt ?? null,
          notes: payload.notes,
        });

        return NextResponse.json({
          ok: true,
          action: payload.type,
          lead_id: result.lead.id,
          task_id: result.task.id,
        });
      }

      case "assign_owner": {
        if (!["admin", "operations"].includes(session.operator.role)) {
          return NextResponse.json(
            {
              error: "Only admins and operations users can reassign lead ownership.",
            },
            { status: 403 },
          );
        }

        const lead = await assignLeadOwner({
          leadId: payload.leadId,
          ownerUserId: payload.ownerUserId ?? null,
        });

        return NextResponse.json({
          ok: true,
          action: payload.type,
          lead_id: lead.id,
          owner_user_id: lead.owner_user_id,
        });
      }

      case "mark_outcome": {
        const lead = await setLeadOutcome({
          leadId: payload.leadId,
          outcome: payload.outcome,
        });

        return NextResponse.json({
          ok: true,
          action: payload.type,
          lead_id: lead.id,
          stage: lead.stage,
          status: lead.status,
        });
      }
    }
  } catch (error) {
    return operatorErrorResponse(error, "Unable to complete lead action.");
  }
}
