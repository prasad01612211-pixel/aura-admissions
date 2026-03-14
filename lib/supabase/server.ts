import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL as string,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Cookie writes are ignored when used from a Server Component.
          }
        },
      },
    },
  );
}
