import type { Lead, Task, TaskPriority, TaskType, User } from "@/types/domain";
import type { ObjectionLog } from "@/types/operations";

export function shouldCreateHotLeadTask(lead: Lead) {
  return (lead.intent_score ?? 0) >= 18 || lead.lead_score >= 50;
}

export function getAutomatedTaskPayload(args: {
  lead: Lead;
  type: TaskType;
  users: User[];
  objection?: ObjectionLog | null;
}): Pick<Task, "task_type" | "priority" | "notes" | "assigned_to"> {
  const counselorId = args.users.find((user) => user.role === "counselor")?.id ?? null;
  const operationsId = args.users.find((user) => user.role === "operations")?.id ?? null;

  const presets: Record<TaskType, { priority: TaskPriority; notes: string; assigned_to: string | null }> = {
    callback: {
      priority: "urgent",
      notes: "Hot lead needs a callback within the SLA window.",
      assigned_to: counselorId,
    },
    visit: {
      priority: "high",
      notes: "Visit request needs slot confirmation and parent hand-holding.",
      assigned_to: operationsId,
    },
    payment_followup: {
      priority: "urgent",
      notes: "Seat-lock or payment follow-up required.",
      assigned_to: operationsId,
    },
    document_followup: {
      priority: "high",
      notes: "Documents are pending. Move the admission forward.",
      assigned_to: operationsId,
    },
    closure: {
      priority: "medium",
      notes: "General counselor review task.",
      assigned_to: counselorId,
    },
  };

  const base = presets[args.type];
  const objectionNote = args.objection
    ? ` Objection: ${args.objection.normalized_objection}. Suggested response: ${args.objection.suggested_response ?? "Review manually."}`
    : "";

  return {
    task_type: args.type,
    priority: args.objection?.severity === "high" && args.type === "closure" ? "urgent" : base.priority,
    notes: `${base.notes}${objectionNote}`.trim(),
    assigned_to: base.assigned_to,
  };
}
