import Link from "next/link";
import { ArrowRight, Building2, IndianRupee, MessageSquareText, ShieldCheck, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeaturedBranchProfiles } from "@/lib/data/branches";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

const heroMetrics = [
  { label: "Pilot capacity", value: "10,000 leads", icon: Users, helper: "Built for sustained intake, not spreadsheet juggling." },
  { label: "Network size", value: "50 branches", icon: Building2, helper: "Branch trust and seat visibility in one command layer." },
  { label: "Incentive", value: "Rs 15,000 / admission", icon: IndianRupee, helper: "Revenue logic stays visible from first lead to payout." },
  { label: "Primary channel", value: "WhatsApp-first", icon: MessageSquareText, helper: "Meet families where they already respond fastest." },
];

const productPrinciples = [
  "Parents are the real decision makers, so every screen prioritizes trust, clarity, and next-step confidence.",
  "The workflow stays human-first for objections, callbacks, visits, and final conversion moments.",
  "Live ops, branch trust, and payment readiness sit in the same system instead of scattered tools.",
];

export default async function MarketingHomePage() {
  const featuredBranches = await getFeaturedBranchProfiles(3);

  return (
    <main className="min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1720px] space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/40 bg-[linear-gradient(135deg,rgba(8,22,36,0.97),rgba(18,53,70,0.94)_56%,rgba(16,93,88,0.82))] px-6 py-8 text-white shadow-[0_28px_90px_rgba(8,24,38,0.24)] lg:px-10 lg:py-10">
          <div className="grid gap-8 xl:grid-cols-[1.12fr,0.88fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.26em] text-[#e3c78f]">
                  Aura Admissions
                </div>
                <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-slate-200">
                  Premium admissions operating system
                </div>
              </div>
              <div>
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.07em] text-white lg:text-6xl">
                  Elite admissions infrastructure for teams that need speed, trust, and closing discipline.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 lg:text-lg">
                  Aura turns branch trust, parent communication, admission forms, payment recovery, and counselor follow-up into one refined operating surface.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
                  Open dashboard
                </Link>
                {featuredBranches[0] ? (
                  <Link href={`/branches/${featuredBranches[0].code}`} className={buttonVariants({ size: "lg", variant: "outline" })}>
                    Preview branch flow
                  </Link>
                ) : null}
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-5 text-sm leading-6 text-slate-200">
                <span className="font-semibold text-white">Data mode:</span>{" "}
                {isSupabaseConfigured
                  ? "Supabase environment detected. This build is wired for live operating data."
                  : "Rendering with typed demo fixtures until Supabase credentials are connected."}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {heroMetrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <div
                    key={metric.label}
                    className="rounded-[1.6rem] border border-white/10 bg-white/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">{metric.label}</div>
                      <div className="rounded-2xl border border-white/10 bg-black/15 p-2 text-[#e3c78f]">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-white">{metric.value}</div>
                    <div className="mt-3 text-sm leading-6 text-slate-300">{metric.helper}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-[1rem] border border-[rgba(15,118,110,0.15)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <CardDescription>Product principles</CardDescription>
                  <CardTitle>Built as an operating system, not just a bot or CRM.</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
              {productPrinciples.map((item) => (
                <div key={item} className="rounded-[1.25rem] border border-white/70 bg-white/70 p-4">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardDescription>Featured branches</CardDescription>
                <CardTitle>Public branch pages start the trust-building loop.</CardTitle>
              </div>
              <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost" }), "gap-2")}>
                Team view
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {featuredBranches.map((branch) => (
                <Link
                  key={branch.id}
                  href={`/branches/${branch.code}`}
                  className="rounded-[1.5rem] border border-white/70 bg-white/72 p-5 transition-all hover:-translate-y-0.5 hover:border-[rgba(179,132,67,0.24)] hover:bg-[rgba(255,248,240,0.88)]"
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">{branch.city}</div>
                  <div className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-950">{branch.name}</div>
                  <div className="mt-4 text-sm leading-6 text-slate-600">{branch.courses.map((course) => course.code).join(" / ")}</div>
                  <div className="mt-5 inline-flex rounded-full border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-3 py-2 text-sm font-medium text-teal-800">
                    {branch.capacity_available} seats open
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
