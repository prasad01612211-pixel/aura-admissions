import { NextResponse } from "next/server";

import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({
      configured: false,
      admin_configured: false,
      live: false,
      mode: "local_fallback",
    });
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json(
      {
        configured: true,
        admin_configured: false,
        live: false,
        mode: "public_only",
        error: "Missing SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      {
        configured: true,
        admin_configured: false,
        live: false,
        mode: "local_fallback",
        error: "Supabase admin client could not be created.",
      },
      { status: 503 },
    );
  }

  const [institutionCount, branchCount, leadCount, taskCount] = await Promise.all([
    supabase.from("institutions").select("id", { count: "exact", head: true }),
    supabase.from("branches").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }),
  ]);

  const firstError = institutionCount.error ?? branchCount.error ?? leadCount.error ?? taskCount.error ?? null;

  if (firstError) {
    return NextResponse.json(
      {
        configured: true,
        admin_configured: true,
        live: false,
        mode: "supabase_error",
        error: firstError.message,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    configured: true,
    admin_configured: true,
    live: true,
    mode: "supabase",
    counts: {
      institutions: institutionCount.count ?? 0,
      branches: branchCount.count ?? 0,
      leads: leadCount.count ?? 0,
      tasks: taskCount.count ?? 0,
    },
  });
}
