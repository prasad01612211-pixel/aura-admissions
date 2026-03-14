import Link from "next/link";

import { MetricCard } from "@/components/dashboard/metric-card";
import { LeadStageBadge, LeadStatusBadge } from "@/components/dashboard/state-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/data/dashboard-snapshot";
import { getLeadDisplayName, humanizeToken } from "@/lib/utils";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr,0.7fr]">
        <Card>
          <CardHeader>
            <CardDescription>Lead funnel</CardDescription>
            <CardTitle>Stage mix across the active funnel</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {snapshot.stage_counts.map((item) => (
              <div key={item.stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">{humanizeToken(item.stage)}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{item.count}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Campaigns</CardDescription>
            <CardTitle>Current outbound batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.campaigns.length > 0 ? (
              snapshot.campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">{campaign.template_name}</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">{campaign.name}</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>Sent: {campaign.sent_count}</div>
                    <div>Replies: {campaign.reply_count}</div>
                    <div>Qualified: {campaign.qualified_count}</div>
                    <div>Payments: {campaign.payment_count}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                No campaigns are available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <CardHeader>
            <CardDescription>Hot leads</CardDescription>
            <CardTitle>High-intent parents ready for human follow-up</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {snapshot.hot_leads.length > 0 ? (
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3 font-medium">Lead</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Stage</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {snapshot.hot_leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="py-4">
                        <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-slate-950 hover:text-sky-700">
                          {getLeadDisplayName(lead.student_name, lead.parent_name)}
                        </Link>
                        <div className="text-slate-500">{lead.parent_phone}</div>
                      </td>
                      <td className="py-4 font-semibold text-slate-950">{lead.lead_score}</td>
                      <td className="py-4">
                        <LeadStageBadge stage={lead.stage} />
                      </td>
                      <td className="py-4">
                        <LeadStatusBadge status={lead.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                No hot leads yet.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Task queue</CardDescription>
            <CardTitle>Human actions that keep the funnel moving</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.task_queue.length > 0 ? (
              snapshot.task_queue.map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium text-slate-950">{humanizeToken(task.task_type)}</div>
                    <LeadStatusBadge status={task.priority === "urgent" ? "hot" : "followup"} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{task.notes}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                No human follow-up tasks are queued yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <Card>
          <CardHeader>
            <CardDescription>Recent activity</CardDescription>
            <CardTitle>Event stream ready for workflow orchestration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.recent_events.length > 0 ? (
              snapshot.recent_events.map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium text-slate-950">{event.lead_name}</div>
                  <div className="mt-1 text-sm text-slate-600">{humanizeToken(event.event_type)}</div>
                  <div className="mt-2 text-xs uppercase tracking-wide text-slate-400">{event.created_at}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                No events have been logged yet.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Branch performance</CardDescription>
            <CardTitle>Readiness snapshot by branch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.branch_performance.map((branch) => (
              <div key={branch.branch_id} className="grid grid-cols-[1.2fr,0.8fr,0.8fr] gap-3 rounded-2xl border border-slate-200 p-4 text-sm">
                <div>
                  <div className="font-medium text-slate-950">{branch.name}</div>
                  <div className="text-slate-500">{branch.district}</div>
                </div>
                <div>
                  <div className="text-slate-500">Hot leads</div>
                  <div className="font-semibold text-slate-950">{branch.hot_leads}</div>
                </div>
                <div>
                  <div className="text-slate-500">Seats open</div>
                  <div className="font-semibold text-slate-950">{branch.capacity_available}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
