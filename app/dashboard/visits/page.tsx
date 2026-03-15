import { CalendarDays, CheckCircle2, MapPinned, UsersRound } from "lucide-react";

import { DashboardPageIntro, DashboardSummaryStat } from "@/components/dashboard/page-intro";
import { VisitBoard } from "@/components/dashboard/visit-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { branches } from "@/lib/fixtures/demo-data";
import { getVisitMetricsSnapshot } from "@/lib/data/visits";

export default async function VisitsPage() {
  const snapshot = await getVisitMetricsSnapshot();
  const branchNames = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]));

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Visit operations"
        badge={snapshot.source_label}
        icon={CalendarDays}
        title="Premium visibility into campus visits, confirmations, and on-ground conversion."
        description="Visits are where trust becomes real. This board keeps scheduling, status, and outcomes tightly managed so families never drift after expressing strong intent."
        stats={[
          { label: "Total visits", value: snapshot.total.toLocaleString(), helper: "All bookings currently tracked in the workflow." },
          { label: "Confirmed", value: snapshot.confirmed.toLocaleString(), helper: "Families with locked-in campus time." },
          { label: "Converted", value: snapshot.converted.toLocaleString(), helper: "Visits that already moved deeper into conversion." },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-5">
        <DashboardSummaryStat label="Total visits" value={snapshot.total.toLocaleString()} />
        <DashboardSummaryStat label="Confirmed" value={snapshot.confirmed.toLocaleString()} />
        <DashboardSummaryStat label="Completed" value={snapshot.completed.toLocaleString()} />
        <DashboardSummaryStat label="No show" value={snapshot.no_show.toLocaleString()} />
        <DashboardSummaryStat label="Converted" value={snapshot.converted.toLocaleString()} />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardDescription>Visit scheduling</CardDescription>
              <CardTitle>Branch visits, attendance, and outcome tracking</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-3 py-2 text-sm text-teal-800">
                <MapPinned className="h-4 w-4" />
                Branch-ready
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(179,132,67,0.22)] bg-[rgba(179,132,67,0.08)] px-3 py-2 text-sm text-[rgb(120,83,34)]">
                <UsersRound className="h-4 w-4" />
                Family journey
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700">
                <CheckCircle2 className="h-4 w-4" />
                Outcome-led
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {snapshot.rows.length > 0 ? (
            <VisitBoard rows={snapshot.rows} branchNames={branchNames} />
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No visit bookings are available yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
