import { redirect } from "next/navigation";
import { ShieldCheck, UsersRound } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOperatorSession } from "@/lib/auth/operator";
import { isSupabaseConfigured } from "@/lib/env";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getOperatorSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath = normalizeNextPath(getSingleValue(resolvedSearchParams.next));
  const errorCode = getSingleValue(resolvedSearchParams.error) ?? null;

  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto grid max-w-[1440px] gap-6 lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[1.05fr,0.95fr]">
        <section className="dashboard-shell overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(135deg,rgba(8,22,36,0.98),rgba(18,53,70,0.94)_56%,rgba(16,93,88,0.84))] px-6 py-8 text-white shadow-[0_28px_90px_rgba(8,24,38,0.24)] lg:px-10 lg:py-10">
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="accent">Aura Admissions</Badge>
                <Badge className="border-white/15 bg-white/10 text-slate-100" variant="neutral">
                  Operator access
                </Badge>
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.07em] text-white lg:text-5xl">
                Secure operator sign-in for the admissions command center.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">
                Every dashboard action now runs behind Supabase-authenticated operator sessions with role-based access control for counselors, operations, finance, and admins.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Access model</div>
                  <ShieldCheck className="h-4 w-4 text-[#e3c78f]" />
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-white">Supabase session</div>
                <div className="mt-3 text-sm leading-6 text-slate-300">Browser session is checked before the dashboard and internal ops APIs are allowed.</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Operator mapping</div>
                  <UsersRound className="h-4 w-4 text-[#e3c78f]" />
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-white">Email to role</div>
                <div className="mt-3 text-sm leading-6 text-slate-300">The signed-in email must match an active row in `public.users` to unlock the console.</div>
              </div>
            </div>
          </div>
        </section>

        <Card className="border-white/70 bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(255,248,240,0.82))]">
          <CardHeader className="pb-4">
            <CardDescription>Admissions console login</CardDescription>
            <CardTitle>Sign in with your operator account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[1.25rem] border border-white/70 bg-white/70 p-4 text-sm leading-6 text-slate-600">
              Use the same email address that exists in the `users` table. If Supabase auth is not configured yet, this page will stay blocked until the environment is wired.
            </div>
            <LoginForm nextPath={nextPath} authAvailable={isSupabaseConfigured} initialError={errorCode} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
