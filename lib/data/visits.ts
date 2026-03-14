import "server-only";

import { branches } from "@/lib/fixtures/demo-data";
import { visitBookings as fixtureVisitBookings } from "@/lib/fixtures/operations-data";
import { getLocalActiveContext } from "@/lib/data/local-state";
import { getVisitBookings } from "@/lib/operations/visits";
import type { Branch } from "@/types/domain";
import type { VisitBooking, VisitMetricsSnapshot } from "@/types/operations";

function mergeById<T extends { id: string }>(rows: T[]) {
  const map = new Map<string, T>();
  rows.forEach((row) => map.set(row.id, row));
  return [...map.values()];
}

export async function getVisitMetricsSnapshot(): Promise<VisitMetricsSnapshot> {
  const localContext = await getLocalActiveContext();
  const rows = mergeById([...fixtureVisitBookings, ...(await getVisitBookings())]);
  const scopedBranches = new Map((localContext.branches.length > 0 ? localContext.branches : branches).map((branch) => [branch.id, branch]));
  const normalizedRows = rows.filter((row) => scopedBranches.has(row.branch_id));

  return {
    data_source: localContext.data_source,
    source_label: localContext.source_label,
    total: normalizedRows.length,
    confirmed: normalizedRows.filter((row) => row.status === "confirmed").length,
    completed: normalizedRows.filter((row) => row.status === "completed").length,
    no_show: normalizedRows.filter((row) => row.outcome_status === "no_show").length,
    converted: normalizedRows.filter((row) => row.outcome_status === "converted").length,
    rows: normalizedRows.sort((left, right) => right.scheduled_for.localeCompare(left.scheduled_for)),
  };
}

export function getVisitBranchName(branchRows: Branch[], booking: VisitBooking) {
  return branchRows.find((branch) => branch.id === booking.branch_id)?.name ?? "Unknown branch";
}
