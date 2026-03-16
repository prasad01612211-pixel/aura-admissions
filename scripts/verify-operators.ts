import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import type { Database } from "@/types/database";
import type { User, UserRole } from "@/types/domain";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

const allowedRoles = new Set<UserRole>(["admin", "operations", "counselor", "finance"]);

type IssueType =
  | "missing_auth_user"
  | "missing_public_user"
  | "inactive_public_user"
  | "duplicate_public_user"
  | "role_gap";

type IssueRow = {
  type: IssueType;
  email: string;
  detail: string;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null;
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

  const authUsers: Array<{ id: string; email: string }> = [];
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

    const users = data.users
      .map((user) => ({
        id: user.id,
        email: normalizeEmail(user.email),
      }))
      .filter((user): user is { id: string; email: string } => Boolean(user.email));

    authUsers.push(...users);

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  const authByEmail = new Map<string, { id: string; email: string }>();
  authUsers.forEach((user) => authByEmail.set(user.email, user));

  const { data: publicUsers, error: publicUsersError } = await supabase.from("users").select("*").order("email");

  if (publicUsersError) {
    console.log(
      JSON.stringify(
        {
          summary: {
            auth_users: authByEmail.size,
            public_users: 0,
            missing_auth_users: null,
            missing_public_users: null,
            inactive_public_users: null,
            duplicate_public_users: null,
            role_gap: null,
          },
          schema_error: publicUsersError.message,
          issues: [],
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const publicUsersByEmail = new Map<string, User[]>();
  ((publicUsers ?? []) as User[]).forEach((user) => {
    const email = normalizeEmail(user.email);
    if (!email) {
      return;
    }
    const current = publicUsersByEmail.get(email) ?? [];
    current.push(user);
    publicUsersByEmail.set(email, current);
  });

  const issues: IssueRow[] = [];

  for (const [email, rows] of publicUsersByEmail.entries()) {
    if (rows.length > 1) {
      issues.push({
        type: "duplicate_public_user",
        email,
        detail: `${rows.length} rows found in public.users`,
      });
    }

    if (!authByEmail.has(email)) {
      issues.push({
        type: "missing_auth_user",
        email,
        detail: "No matching Supabase Auth user",
      });
    }

    rows.forEach((row) => {
      if (!row.active) {
        issues.push({
          type: "inactive_public_user",
          email,
          detail: `public.users row ${row.id} is inactive`,
        });
      }

      if (!allowedRoles.has(row.role)) {
        issues.push({
          type: "role_gap",
          email,
          detail: `Unsupported role: ${row.role}`,
        });
      }
    });
  }

  for (const [email, user] of authByEmail.entries()) {
    if (!publicUsersByEmail.has(email)) {
      issues.push({
        type: "missing_public_user",
        email,
        detail: `Auth user ${user.id} has no matching public.users row`,
      });
    }
  }

  const summary = {
    auth_users: authByEmail.size,
    public_users: publicUsersByEmail.size,
    missing_auth_users: issues.filter((issue) => issue.type === "missing_auth_user").length,
    missing_public_users: issues.filter((issue) => issue.type === "missing_public_user").length,
    inactive_public_users: issues.filter((issue) => issue.type === "inactive_public_user").length,
    duplicate_public_users: issues.filter((issue) => issue.type === "duplicate_public_user").length,
    role_gap: issues.filter((issue) => issue.type === "role_gap").length,
  };

  console.log(JSON.stringify({ summary, issues }, null, 2));

  if (
    summary.missing_auth_users > 0 ||
    summary.missing_public_users > 0 ||
    summary.inactive_public_users > 0 ||
    summary.duplicate_public_users > 0
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Operator verification failed.");
  process.exitCode = 1;
});
