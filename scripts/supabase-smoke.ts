import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAdminEnv } from "../lib/env";
import type { Database } from "../types/database";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

async function main() {
  const { serviceRoleKey, url } = requireSupabaseAdminEnv();
  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const [institutionCount, branchCount, leadCount, taskCount] = await Promise.all([
    supabase.from("institutions").select("id", { count: "exact", head: true }),
    supabase.from("branches").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }),
  ]);

  const firstError = institutionCount.error ?? branchCount.error ?? leadCount.error ?? taskCount.error ?? null;

  if (firstError) {
    throw new Error(firstError.message);
  }

  console.log("Supabase live wiring OK");
  console.log(
    JSON.stringify(
      {
        institutions: institutionCount.count ?? 0,
        branches: branchCount.count ?? 0,
        leads: leadCount.count ?? 0,
        tasks: taskCount.count ?? 0,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("Supabase smoke check failed:", error);
  process.exitCode = 1;
});
