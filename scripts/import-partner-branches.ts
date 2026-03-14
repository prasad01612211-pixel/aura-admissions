import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAdminEnv } from "../lib/env";
import { getDefaultPartnerBranchMasterPath } from "../lib/partner-branch-master";
import { importPartnerBranchMasterToSupabase } from "../lib/supabase/live-sync";
import type { Database } from "../types/database";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

function getOptionValue(prefix: string) {
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

async function main() {
  const inputPath = process.argv.slice(2).find((value) => !value.startsWith("--")) ?? getDefaultPartnerBranchMasterPath();
  const importedByUserId = getOptionValue("--owner=");
  const { serviceRoleKey, url } = requireSupabaseAdminEnv();
  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const result = await importPartnerBranchMasterToSupabase({
    supabase,
    filePath: inputPath,
    importedByUserId,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
