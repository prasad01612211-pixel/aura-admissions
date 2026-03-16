import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import type { Database } from "@/types/database";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

type AuthUser = {
  id: string;
  email: string | null;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null;
}

async function findAuthUserByEmail(
  supabase: ReturnType<typeof createClient<Database>>,
  email: string,
) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Unable to list auth users: ${error.message}`);
    }

    const users = data.users as AuthUser[];
    const match = users.find((user) => normalizeEmail(user.email) === email);

    if (match) {
      return match;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function main() {
  const emailArg = process.argv[2];
  const passwordArg = process.argv[3];
  const normalizedEmail = normalizeEmail(emailArg);

  if (!normalizedEmail) {
    throw new Error(
      "Provide the email address to create (example: tsx scripts/create-auth-user.ts ops@domain.com [tempPassword]).",
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

  const existingUser = await findAuthUserByEmail(supabase, normalizedEmail);
  const tempPassword = passwordArg?.trim() || randomBytes(18).toString("base64url");

  if (existingUser) {
    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: tempPassword,
      email_confirm: true,
    });

    if (error) {
      throw new Error(`Unable to update auth user password: ${error.message}`);
    }
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
    });

    if (error) {
      throw new Error(`Unable to create auth user: ${error.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        email: normalizedEmail,
        auth_user_status: existingUser ? "updated" : "created",
        temp_password: tempPassword,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Auth user creation failed.");
  process.exitCode = 1;
});
