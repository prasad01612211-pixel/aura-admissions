"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { TaskPriority, TaskType, User } from "@/types/domain";

type LeadActionsProps = {
  branchId: string | null;
  leadId: string;
  ownerUserId: string | null;
  users: Pick<User, "id" | "name">[];
};

const taskTypeOptions: TaskType[] = ["callback", "visit", "payment_followup", "document_followup", "closure"];
const priorityOptions: TaskPriority[] = ["medium", "high", "urgent"];

export function LeadActions({ branchId, leadId, ownerUserId, users }: LeadActionsProps) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [callNotes, setCallNotes] = useState("");
  const [selectedOwner, setSelectedOwner] = useState(ownerUserId ?? "");
  const [taskType, setTaskType] = useState<TaskType>("closure");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [taskNotes, setTaskNotes] = useState("Follow up with parent and move the funnel forward.");
  const [dueAt, setDueAt] = useState("");

  const submitAction = async (actionKey: string, payload: Record<string, unknown>, successMessage: string) => {
    setActiveAction(actionKey);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/lead-actions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ leadId, ...payload }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Action failed.");
      setActiveAction(null);
      return;
    }

    setMessage(successMessage);
    setActiveAction(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr,auto]">
        <input
          value={callNotes}
          onChange={(event) => setCallNotes(event.target.value)}
          className="h-11 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900"
          placeholder="Call notes"
        />
        <Button
          type="button"
          onClick={() =>
            submitAction(
              "mark_called",
              {
                type: "mark_called",
                notes: callNotes || null,
              },
              "Call activity logged.",
            )
          }
          disabled={activeAction !== null}
        >
          {activeAction === "mark_called" ? "Saving..." : "Mark as called"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr,auto]">
        <select
          value={selectedOwner}
          onChange={(event) => setSelectedOwner(event.target.value)}
          className="h-11 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900"
        >
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            submitAction(
              "assign_owner",
              {
                type: "assign_owner",
                ownerUserId: selectedOwner || null,
              },
              "Owner updated.",
            )
          }
          disabled={activeAction !== null}
        >
          {activeAction === "assign_owner" ? "Saving..." : "Assign owner"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={taskType}
          onChange={(event) => setTaskType(event.target.value as TaskType)}
          className="h-11 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900"
        >
          {taskTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskPriority)}
          className="h-11 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900"
        >
          {priorityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={assignedTo}
          onChange={(event) => setAssignedTo(event.target.value)}
          className="h-11 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900"
        >
          <option value="">No assignee</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          className="h-11 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900"
        />
        <input
          value={taskNotes}
          onChange={(event) => setTaskNotes(event.target.value)}
          className="h-11 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900 md:col-span-2"
          placeholder="Task notes"
        />
        <Button
          type="button"
          variant="outline"
          className="md:col-span-2"
          onClick={() =>
            submitAction(
              "create_task",
              {
                type: "create_task",
                branchId,
                assignedTo: assignedTo || null,
                taskType,
                priority,
                dueAt: dueAt ? new Date(dueAt).toISOString() : null,
                notes: taskNotes,
              },
              "Task created.",
            )
          }
          disabled={activeAction !== null || taskNotes.trim().length < 4}
        >
          {activeAction === "create_task" ? "Saving..." : "Create task"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            submitAction(
              "mark_won",
              {
                type: "mark_outcome",
                outcome: "won",
              },
              "Lead marked as won.",
            )
          }
          disabled={activeAction !== null}
        >
          {activeAction === "mark_won" ? "Saving..." : "Mark won"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            submitAction(
              "mark_lost",
              {
                type: "mark_outcome",
                outcome: "lost",
              },
              "Lead marked as lost.",
            )
          }
          disabled={activeAction !== null}
        >
          {activeAction === "mark_lost" ? "Saving..." : "Mark lost"}
        </Button>
      </div>

      {message ? <div className="text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
    </div>
  );
}
