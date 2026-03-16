import "server-only";

import { redirect } from "next/navigation";

import { users as fixtureUsers } from "@/lib/fixtures/demo-data";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { User, UserRole } from "@/types/domain";

export class OperatorAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OperatorAccessError";
    this.status = status;
  }
}

export type OperatorSession = {
  authUserId: string;
  authEmail: string;
  operator: User;
};

function isMissingAuthSession(error: { name?: string; message?: string; status?: number }) {
  const name = error.name ?? "";
  const message = (error.message ?? "").toLowerCase();

  return (
    name === "AuthSessionMissingError" ||
    message.includes("auth session missing") ||
    message.includes("missing auth session")
  );
}

async function loadOperatorByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const adminSupabase = createAdminSupabaseClient();

  if (adminSupabase) {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      throw new OperatorAccessError(error.message, 500);
    }

    return (data as User | null) ?? null;
  }

  const serverSupabase = await createServerSupabaseClient();

  if (!serverSupabase) {
    return null;
  }

  const { data, error } = await serverSupabase
    .from("users")
    .select("*")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new OperatorAccessError(error.message, 500);
  }

  return (data as User | null) ?? null;
}

export async function getOperatorSession(): Promise<OperatorSession | null> {
  if (!isSupabaseConfigured) {
    const fallbackOperator =
      fixtureUsers.find((user) => user.active && user.role === "admin") ??
      fixtureUsers.find((user) => user.active) ??
      null;

    if (!fallbackOperator) {
      return null;
    }

    return {
      authUserId: fallbackOperator.id,
      authEmail: fallbackOperator.email ?? "local-mode@admissions.local",
      operator: fallbackOperator,
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (isMissingAuthSession(error)) {
      return null;
    }
    throw new OperatorAccessError(error.message, 401);
  }

  if (!user?.email) {
    return null;
  }

  const operator = await loadOperatorByEmail(user.email);

  if (!operator || !operator.active) {
    return null;
  }

  return {
    authUserId: user.id,
    authEmail: user.email,
    operator,
  };
}

function roleAllowed(role: UserRole, allowedRoles: UserRole[]) {
  return allowedRoles.includes(role);
}

export async function requireOperatorSession(allowedRoles?: UserRole[]): Promise<OperatorSession> {
  const session = await getOperatorSession();

  if (!session) {
    throw new OperatorAccessError("Operator authentication required.", 401);
  }

  if (allowedRoles && !roleAllowed(session.operator.role, allowedRoles)) {
    throw new OperatorAccessError("You do not have permission to perform this action.", 403);
  }

  return session;
}

export async function requireDashboardOperator(allowedRoles?: UserRole[]) {
  try {
    return await requireOperatorSession(allowedRoles);
  } catch (error) {
    if (error instanceof OperatorAccessError) {
      if (error.status === 401) {
        redirect("/auth/login");
      }

      redirect("/dashboard?access=forbidden");
    }

    throw error;
  }
}
