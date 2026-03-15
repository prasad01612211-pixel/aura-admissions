import { NextResponse } from "next/server";

import { getConversionEngineSnapshot } from "@/lib/data/conversion-engine";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await getConversionEngineSnapshot();

    return NextResponse.json({
      ok: true,
      ...snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load conversion engine metrics.",
      },
      { status: 500 },
    );
  }
}
