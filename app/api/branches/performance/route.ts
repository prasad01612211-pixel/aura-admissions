import { NextResponse } from "next/server";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { getBranchAnalyticsSnapshot } from "@/lib/data/analytics";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiOperator(["admin", "counselor", "operations", "finance"]);
    const snapshot = await getBranchAnalyticsSnapshot();

    return NextResponse.json({
      ok: true,
      ...snapshot,
    });
  } catch (error) {
    return operatorErrorResponse(error, "Unable to load branch performance.");
  }
}
