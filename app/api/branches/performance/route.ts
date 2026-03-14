import { NextResponse } from "next/server";

import { getBranchAnalyticsSnapshot } from "@/lib/data/analytics";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await getBranchAnalyticsSnapshot();

    return NextResponse.json({
      ok: true,
      ...snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load branch performance.",
      },
      { status: 500 },
    );
  }
}
