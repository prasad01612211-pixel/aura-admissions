import { readFile } from "fs/promises";
import { basename, resolve } from "path";

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAdminEnv } from "../lib/env";
import { getExistingLeadPhonesFromSupabase, importLeadFileToSupabase } from "../lib/supabase/live-sync";
import type { Database } from "../types/database";
import type { LeadOptInStatus } from "../types/domain";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

function toFsPath(absolutePath: string) {
  if (process.platform === "win32" && !absolutePath.startsWith("\\\\?\\") && absolutePath.length > 240) {
    return `\\\\?\\${absolutePath}`;
  }

  return absolutePath;
}

function getOptionValue(prefix: string) {
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

async function main() {
  const inputPath = process.argv.slice(2).find((value) => !value.startsWith("--"));

  if (!inputPath) {
    console.error("Usage: npm run import:supabase -- <file-path> [--opt-in=unknown|opted_in|opted_out] [--owner=<uuid>]");
    process.exitCode = 1;
    return;
  }

  const optInStatus = (getOptionValue("--opt-in=") ?? "unknown") as LeadOptInStatus;
  const ownerUserId = getOptionValue("--owner=");
  const absolutePath = resolve(inputPath);
  const { serviceRoleKey, url } = requireSupabaseAdminEnv();
  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const buffer = await readFile(toFsPath(absolutePath));
  const existingPhones = await getExistingLeadPhonesFromSupabase(supabase);
  const result = await importLeadFileToSupabase({
    supabase,
    buffer,
    fileName: basename(absolutePath),
    sourcePath: absolutePath,
    existingPhones,
    optInStatus,
    capturedFrom: "import_supabase_script",
    ownerUserId,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
