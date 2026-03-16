"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type LoginFormProps = {
  nextPath: string;
  authAvailable: boolean;
  initialError?: string | null;
};

function getFriendlyErrorMessage(errorCode?: string | null) {
  switch (errorCode) {
    case "forbidden":
      return "Your account does not have permission to access the admissions console.";
    default:
      return null;
  }
}

export function LoginForm({ nextPath, authAvailable, initialError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(getFriendlyErrorMessage(initialError));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authAvailable) {
      setErrorMessage("Supabase auth is not configured for this environment yet.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.replace(nextPath || "/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm">
        <span className="text-slate-600">Operator email</span>
        <input
          className="dashboard-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ops@yourcollege.com"
          required
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="text-slate-600">Password</span>
        <input
          className="dashboard-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
        />
      </label>

      {errorMessage ? <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      <Button className="w-full" size="lg" type="submit" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in to dashboard"}
      </Button>
    </form>
  );
}
