"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { TaskPriority, TaskQueueSnapshot, TaskStatus } from "@/types/domain";

type TaskBoardProps = {
  snapshot: TaskQueueSnapshot;
};

export function TaskBoard({ snapshot }: TaskBoardProps) {
  const router = useRouter();
  const [ownerFilter, setOwnerFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredItems = useMemo(
    () =>
      snapshot.items.filter((task) => {
        if (ownerFilter && task.assigned_to !== ownerFilter) return false;
        if (priorityFilter && task.priority !== priorityFilter) return false;
        if (statusFilter && task.status !== statusFilter) return false;
        return true;
      }),
    [ownerFilter, priorityFilter, snapshot.items, statusFilter],
  );

  async function patchTask(taskId: string, payload: Record<string, unknown>) {
    setUpdatingId(taskId);
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setUpdatingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={ownerFilter}
          onChange={(event) => setOwnerFilter(event.target.value)}
          className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900"
        >
          <option value="">All owners</option>
          {(snapshot.users ?? []).map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value as TaskPriority | "")}
          className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900"
        >
          <option value="">All priorities</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="urgent">urgent</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as TaskStatus | "")}
          className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900"
        >
          <option value="">All statuses</option>
          <option value="open">open</option>
          <option value="in_progress">in progress</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3 font-medium">Lead</th>
              <th className="pb-3 font-medium">Task</th>
              <th className="pb-3 font-medium">Assignee</th>
              <th className="pb-3 font-medium">Priority</th>
              <th className="pb-3 font-medium">Due</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredItems.map((task) => (
              <tr key={task.id}>
                <td className="py-4">
                  <div className="font-medium text-slate-950">{task.lead_name}</div>
                  <div className="text-slate-500">{task.parent_phone ?? "No phone"}</div>
                </td>
                <td className="py-4">
                  <div className="font-medium text-slate-950">{task.title ?? task.task_type.replace(/_/g, " ")}</div>
                  <div className="mt-1 text-slate-500">{task.notes ?? task.description ?? "No notes"}</div>
                </td>
                <td className="py-4">
                  <select
                    value={task.assigned_to ?? ""}
                    onChange={(event) => patchTask(task.id, { assignedTo: event.target.value || null })}
                    className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  >
                    <option value="">Unassigned</option>
                    {(snapshot.users ?? []).map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-4 text-slate-600">{task.priority}</td>
                <td className="py-4">
                  <input
                    type="datetime-local"
                    defaultValue={task.due_at ? task.due_at.slice(0, 16) : ""}
                    onBlur={(event) =>
                      patchTask(task.id, {
                        dueAt: event.target.value ? new Date(event.target.value).toISOString() : null,
                      })
                    }
                    className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  />
                </td>
                <td className="py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={updatingId === task.id}
                      onClick={() => patchTask(task.id, { status: "completed" })}
                    >
                      Mark done
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={updatingId === task.id}
                      onClick={() => patchTask(task.id, { status: "in_progress" })}
                    >
                      Start
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
