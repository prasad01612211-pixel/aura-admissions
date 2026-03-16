import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import type { Database, TableInsert } from "@/types/database";
import type { UserRole } from "@/types/domain";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null;
}

function titleize(value: string) {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function main() {
  const emailArg = process.argv[2];
  const roleArg = process.argv[3];
  const nameArg = process.argv[4];
  const phoneArg = process.argv[5];

  const normalizedEmail = normalizeEmail(emailArg);

  if (!normalizedEmail) {
    throw new Error(
      "Provide the email address (example: tsx scripts/create-public-user.ts ops@domain.com [role] [name] [phone]).",
    );
  }

  const { requireSupabaseAdminEnv } = await import("../lib/env");
  const { serviceRoleKey, url } = requireSupabaseAdminEnv();

  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const fallbackName = titleize(normalizedEmail.split("@")[0] ?? normalizedEmail);
  const role = (roleArg?.trim().toLowerCase() || "admin") as UserRole;
  const name = (nameArg?.trim() || fallbackName).slice(0, 120);
  const phone = phoneArg?.trim() || null;

  const row: TableInsert<"users"> = {
    name,
    role,
    email: normalizedEmail,
    phone,
    active: true,
  };

  const { data, error } = await supabase
    .from("users")
    .upsert([row] as never, {
      onConflict: "email",
    })
    .select("id, name, role, email, phone, active, created_at")
    .single();

  if (error) {
    throw new Error(`Unable to upsert public.users: ${error.message}`);
  }

  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Public user creation failed.");
  process.exitCode = 1;
});
