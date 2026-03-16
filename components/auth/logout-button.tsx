"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
  compact?: boolean;
};

export function LogoutButton({ className, compact = false }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={cn(
        buttonVariants({ variant: "outline", size: compact ? "sm" : "md" }),
        compact ? "gap-2 rounded-full" : "w-full gap-2 justify-center",
        className,
      )}
    >
      <LogOut className="h-4 w-4" />
      <span>{compact ? "Logout" : "Sign out"}</span>
    </button>
  );
}
