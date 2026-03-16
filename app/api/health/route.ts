import { NextResponse } from "next/server";

const bootedAt = new Date().toISOString();

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    booted_at: bootedAt,
    timestamp: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    supabase_configured:
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  });
}
