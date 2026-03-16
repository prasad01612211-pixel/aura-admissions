import { NextResponse } from "next/server";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { getDashboardSnapshot } from "@/lib/data/dashboard-snapshot";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiOperator(["admin", "counselor", "operations", "finance"]);
    const snapshot = await getDashboardSnapshot();

    return NextResponse.json({
      ok: true,
      metrics: snapshot.metrics,
      stage_counts: snapshot.stage_counts,
      recent_events: snapshot.recent_events,
      hot_leads: snapshot.hot_leads.slice(0, 10),
    });
  } catch (error) {
    return operatorErrorResponse(error, "Unable to load dashboard metrics.");
  }
}
