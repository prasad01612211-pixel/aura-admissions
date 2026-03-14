import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createBrowserSupabaseClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL as string,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
