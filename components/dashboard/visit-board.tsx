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
    <div className="overflow-x-auto rounded-[1.5rem] border border-white/70 bg-white/72 p-3">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200/80 text-slate-500">
          <tr>
            <th className="pb-4 pt-1 font-medium">Branch</th>
            <th className="pb-4 pt-1 font-medium">Scheduled for</th>
            <th className="pb-4 pt-1 font-medium">Status</th>
            <th className="pb-4 pt-1 font-medium">Outcome</th>
            <th className="pb-4 pt-1 font-medium">Notes</th>
            <th className="pb-4 pt-1 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/80">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              <td className="py-4 pr-4 font-semibold text-slate-950">{branchNames[row.branch_id] ?? "Unknown branch"}</td>
              <td className="py-4 pr-4 text-slate-600">{new Date(row.scheduled_for).toLocaleString("en-IN")}</td>
              <td className="py-4 pr-4">
                <select
                  value={row.status}
                  onChange={(event) => patchVisit(row.id, { status: event.target.value })}
                  className="dashboard-input h-10"
                >
                  <option value="proposed">proposed</option>
                  <option value="confirmed">confirmed</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </td>
              <td className="py-4 pr-4">
                <select
                  value={row.outcome_status ?? ""}
                  onChange={(event) => patchVisit(row.id, { outcomeStatus: event.target.value || null })}
                  className="dashboard-input h-10"
                >
                  <option value="">-</option>
                  <option value="attended">attended</option>
                  <option value="rescheduled">rescheduled</option>
                  <option value="no_show">no_show</option>
                  <option value="converted">converted</option>
                </select>
              </td>
              <td className="py-4 pr-4 text-slate-600">{row.notes ?? "-"}</td>
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
