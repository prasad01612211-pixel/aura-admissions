import Link from "next/link";
import { ArrowRight, Building2, IndianRupee, MessageSquareText, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeaturedBranchProfiles } from "@/lib/data/branches";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

const heroMetrics = [
  { label: "Pilot capacity", value: "10,000 leads", icon: Users },
  { label: "Network size", value: "50 branches", icon: Building2 },
  { label: "Incentive", value: "Rs 15,000 per admission", icon: IndianRupee },
  { label: "Primary channel", value: "WhatsApp-first funnel", icon: MessageSquareText },
];

export default async function MarketingHomePage() {
  const featuredBranches = await getFeaturedBranchProfiles(3);

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-sm lg:p-12">
          <div className="grid gap-12 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-6">
              <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
                Milestone 1 foundation
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 lg:text-6xl">
                  WhatsApp-first admissions conversion funnel for parents.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600">
                  This MVP is built for a lean Hyderabad consultancy team that must qualify, route, and convert parent
                  leads without adding heavy operational overhead.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
                  Open dashboard
                </Link>
                {featuredBranches[0] ? (
                  <Link
                    href={`/branches/${featuredBranches[0].code}`}
                    className={buttonVariants({ size: "lg", variant: "outline" })}
                  >
                    Preview branch flow
                  </Link>
                ) : null}
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Data mode:</span>{" "}
                {isSupabaseConfigured
                  ? "Supabase environment detected."
                  : "Rendering with typed demo fixtures until Supabase credentials are connected."}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {heroMetrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <Card key={metric.label} className="bg-slate-950 text-white">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-slate-400">{metric.label}</CardDescription>
                        <Icon className="h-4 w-4 text-sky-300" />
                      </div>
                      <CardTitle className="text-2xl text-white">{metric.value}</CardTitle>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr,1.2fr]">
          <Card>
            <CardHeader>
              <CardDescription>Product principles</CardDescription>
              <CardTitle>Built as a funnel, not a bot.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                Parents are the real decision makers, so every screen prioritizes trust, clarity, and next-step
                confidence.
              </p>
              <p>
                Rule-based qualification and routing keep the MVP fast to operate while staying easy to scale toward 2
                lakh and beyond.
              </p>
              <p>Humans only step in for hot leads, callbacks, visits, and final conversion moments.</p>
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
                  className="rounded-3xl border border-slate-200 p-4 transition-colors hover:border-sky-300 hover:bg-sky-50"
                >
                  <div className="text-sm text-slate-500">{branch.city}</div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{branch.name}</div>
                  <div className="mt-3 text-sm text-slate-600">{branch.courses.map((course) => course.code).join(" | ")}</div>
                  <div className="mt-4 text-sm font-medium text-sky-700">{branch.capacity_available} seats open</div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
