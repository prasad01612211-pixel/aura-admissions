import { NextResponse } from "next/server";

import { getTaskQueueSnapshot } from "@/lib/data/tasks";
import type { TaskPriority, TaskStatus } from "@/types/domain";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const snapshot = await getTaskQueueSnapshot({
      assignedTo: searchParams.get("assignedTo") ?? undefined,
      priority: (searchParams.get("priority") as TaskPriority | null) ?? undefined,
      status: (searchParams.get("status") as TaskStatus | null) ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      ...snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load task queue.",
      },
      { status: 500 },
    );
  }
}
