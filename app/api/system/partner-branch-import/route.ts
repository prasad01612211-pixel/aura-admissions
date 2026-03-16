import { NextResponse } from "next/server";
import { z } from "zod";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { importPartnerBranchMasterToSupabase } from "@/lib/supabase/live-sync";

const payloadSchema = z.object({
  filePath: z.string().min(1).optional(),
  importedByUserId: z.string().uuid().optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireApiOperator(["admin"]);
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

    const rawBody = await request.text();
    const payload = rawBody ? payloadSchema.parse(JSON.parse(rawBody)) : {};
    const result = await importPartnerBranchMasterToSupabase({
      supabase,
      filePath: payload.filePath,
      importedByUserId: payload.importedByUserId ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    return operatorErrorResponse(error, "Unable to import partner branch master.");
  }
}
