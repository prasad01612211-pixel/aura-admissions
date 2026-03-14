"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { VisitBooking } from "@/types/operations";

type VisitBoardProps = {
  rows: VisitBooking[];
  branchNames: Record<string, string>;
};

export function VisitBoard({ rows, branchNames }: VisitBoardProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function patchVisit(id: string, payload: Record<string, unknown>) {
    setUpdatingId(id);
    await fetch("/api/visits", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    setUpdatingId(null);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="pb-3 font-medium">Branch</th>
            <th className="pb-3 font-medium">Scheduled for</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Outcome</th>
            <th className="pb-3 font-medium">Notes</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-4 font-medium text-slate-950">{branchNames[row.branch_id] ?? "Unknown branch"}</td>
              <td className="py-4 text-slate-600">{new Date(row.scheduled_for).toLocaleString("en-IN")}</td>
              <td className="py-4">
                <select
                  value={row.status}
                  onChange={(event) => patchVisit(row.id, { status: event.target.value })}
                  className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="proposed">proposed</option>
                  <option value="confirmed">confirmed</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </td>
              <td className="py-4">
                <select
                  value={row.outcome_status ?? ""}
                  onChange={(event) => patchVisit(row.id, { outcomeStatus: event.target.value || null })}
                  className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">—</option>
                  <option value="attended">attended</option>
                  <option value="rescheduled">rescheduled</option>
                  <option value="no_show">no_show</option>
                  <option value="converted">converted</option>
                </select>
              </td>
              <td className="py-4 text-slate-600">{row.notes ?? "—"}</td>
              <td className="py-4">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={updatingId === row.id}
                  onClick={() => patchVisit(row.id, { status: "confirmed" })}
                >
                  Confirm
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
