import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

const healthTables = ["institutions", "branches", "leads", "tasks"] as const;

type HealthTable = (typeof healthTables)[number];

async function loadTableHealth(supabase: SupabaseClient<Database>, table: HealthTable) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact" }).limit(1);

  return {
    table,
    count,
    error: error?.message ?? null,
  };
}

export async function GET() {
  try {
    await requireApiOperator(["admin"]);

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

    const results = await Promise.all(healthTables.map((table) => loadTableHealth(supabase, table)));

    const firstError = results.find((result) => result.error);

    if (firstError) {
      return NextResponse.json(
        {
          configured: true,
          admin_configured: true,
          live: false,
          mode: "supabase_error",
          error: `[${firstError.table}] ${firstError.error}`,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      configured: true,
      admin_configured: true,
      live: true,
      mode: "supabase",
      counts: Object.fromEntries(results.map((result) => [result.table, result.count])),
    });
  } catch (error) {
    return operatorErrorResponse(error, "Unable to load Supabase status.");
  }
}
