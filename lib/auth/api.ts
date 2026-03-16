import { NextResponse } from "next/server";

import { OperatorAccessError, requireOperatorSession } from "@/lib/auth/operator";
import type { UserRole } from "@/types/domain";

export async function requireApiOperator(allowedRoles?: UserRole[]) {
  return requireOperatorSession(allowedRoles);
}

export function operatorErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof OperatorAccessError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    { status: 500 },
  );
}
