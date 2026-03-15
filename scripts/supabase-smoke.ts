import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

const healthTables = ["institutions", "branches", "leads", "tasks"] as const;

type HealthTable = (typeof healthTables)[number];

async function loadTableHealth(
  supabase: SupabaseClient<Database>,
  table: HealthTable,
) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact" }).limit(1);

  return {
    table,
    count,
    error: error?.message ?? null,
  };
}

async function main() {
  const { requireSupabaseAdminEnv } = await import("../lib/env");
  const { serviceRoleKey, url } = requireSupabaseAdminEnv();
  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const results = await Promise.all(healthTables.map((table) => loadTableHealth(supabase, table)));

  const firstError = results.find((result) => result.error);

  if (firstError) {
    throw new Error(`[${firstError.table}] ${firstError.error}`);
  }

  console.log("Supabase live read access OK");
  console.log(
    JSON.stringify(
      Object.fromEntries(results.map((result) => [result.table, result.count])),
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("Supabase smoke check failed:", error);
  process.exitCode = 1;
});
