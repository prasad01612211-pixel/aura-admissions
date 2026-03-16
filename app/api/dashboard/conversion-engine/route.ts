import { NextResponse } from "next/server";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { getConversionEngineSnapshot } from "@/lib/data/conversion-engine";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiOperator(["admin", "counselor", "operations", "finance"]);
    const snapshot = await getConversionEngineSnapshot();

    return NextResponse.json({
      ok: true,
      ...snapshot,
    });
  } catch (error) {
    return operatorErrorResponse(error, "Unable to load conversion engine metrics.");
  }
}
