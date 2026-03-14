import "server-only";

import { createClient } from "@supabase/supabase-js";

import { isSupabaseAdminConfigured, publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createAdminSupabaseClient() {
  if (!isSupabaseAdminConfigured) {
    return null;
  }

  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL as string,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
