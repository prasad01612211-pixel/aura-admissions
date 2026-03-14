import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { syncPartnerTrustSeedData } from "@/lib/supabase/live-sync";

const syncSchema = z.object({
  includeBranchAssets: z.boolean().optional(),
  includeTrustAssets: z.boolean().optional(),
  includeReviews: z.boolean().optional(),
  includeFeeSnapshots: z.boolean().optional(),
  includeSeatInventory: z.boolean().optional(),
  includeCommissionRules: z.boolean().optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase admin credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  try {
    const rawBody = await request.text();
    const payload = rawBody ? syncSchema.parse(JSON.parse(rawBody)) : {};
    const result = await syncPartnerTrustSeedData(supabase, payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to sync partner and trust data.",
      },
      { status: 400 },
    );
  }
}
