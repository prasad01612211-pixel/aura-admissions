import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { syncPartnerTrustSeedData } from "../lib/supabase/live-sync";
import type { Database } from "../types/database";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

async function main() {
  const args = process.argv.slice(2);
  const { requireSupabaseAdminEnv } = await import("../lib/env");
  const { serviceRoleKey, url } = requireSupabaseAdminEnv();
  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const result = await syncPartnerTrustSeedData(supabase, {
    includeBranchAssets: !args.includes("--skip-branch-assets"),
    includeTrustAssets: !args.includes("--skip-trust-assets"),
    includeReviews: !args.includes("--skip-reviews"),
    includeFeeSnapshots: !args.includes("--skip-fees"),
    includeSeatInventory: !args.includes("--skip-seat-inventory"),
    includeCommissionRules: !args.includes("--skip-commission-rules"),
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
