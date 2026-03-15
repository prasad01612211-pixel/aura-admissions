import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Flame,
  Landmark,
  Megaphone,
  Radar,
  Sparkles,
  WalletCards,
} from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { LeadStageBadge, LeadStatusBadge } from "@/components/dashboard/state-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/data/dashboard-snapshot";
import { getLeadDisplayName, humanizeToken } from "@/lib/utils";

function formatEventTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();
  const totalStageCount = snapshot.stage_counts.reduce((sum, item) => sum + item.count, 0);
  const topStageMix = [...snapshot.stage_counts].sort((left, right) => right.count - left.count).slice(0, 5);
  const topBranches = [...snapshot.branch_performance].slice(0, 4);

  const getMetric = (label: string) => snapshot.metrics.find((metric) => metric.label === label);

  const spotlightStats = [
    {
      label: "Hot queue",
      value: getMetric("Hot + priority leads")?.value ?? "0",
      helper: "Leads ready for hands-on counseling",
      icon: Flame,
    },
    {
      label: "Visits booked",
      value: getMetric("Visits booked")?.value ?? "0",
      helper: "Families already moving on-ground",
      icon: CalendarCheck2,
    },
    {
      label: "Ready for payout",
      value: getMetric("Ready for payout")?.value ?? "0",
      helper: "Conversion value moving toward revenue",
      icon: WalletCards,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
        <Card className="overflow-hidden border-[rgba(179,132,67,0.18)] bg-[linear-gradient(135deg,rgba(11,27,40,0.96),rgba(19,53,69,0.92)_56%,rgba(19,91,91,0.82))] text-white shadow-[0_28px_90px_rgba(8,24,38,0.24)]">
          <CardHeader className="pb-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="accent">Control tower</Badge>
              <Badge className="border-white/15 bg-white/10 text-slate-100" variant="neutral">
                Executive overview
              </Badge>
            </div>
            <CardTitle className="max-w-3xl pt-3 text-3xl leading-tight tracking-[-0.06em] text-white sm:text-[2.7rem]">
              Elite visibility across the admissions funnel, branch readiness, and human follow-through.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 text-slate-200">
              This overview is designed to answer three questions instantly: where the best leads are, what the team must do next, and which branches are operationally ready to close.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {spotlightStats.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">{item.label}</div>
                    <div className="rounded-2xl border border-white/10 bg-black/15 p-2 text-[#e6c996]">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-white">{item.value}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.helper}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-[linear-gradient(180deg,rgba(255,252,247,0.88),rgba(255,248,240,0.8))]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] border border-[rgba(179,132,67,0.18)] bg-[rgba(179,132,67,0.08)] p-2 text-[rgb(120,83,34)]">
                <Radar className="h-4 w-4" />
              </div>
              <div>
                <CardDescription>Funnel pulse</CardDescription>
                <CardTitle>Where the active volume is clustering</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {topStageMix.map((item, index) => {
              const share = totalStageCount > 0 ? Math.round((item.count / totalStageCount) * 100) : 0;

              return (
                <div key={item.stage}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                        {(index + 1).toString().padStart(2, "0")}
                      </div>
                      <div className="font-medium text-slate-900">{humanizeToken(item.stage)}</div>
                    </div>
                    <div className="text-slate-500">
                      {item.count} <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">{share}%</span>
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#b38443)]"
                      style={{ width: `${Math.max(share, item.count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <div className="rounded-[1.35rem] border border-white/70 bg-white/70 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Campaign pressure</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{snapshot.campaigns.length}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">Outbound batches currently shaping lead flow and reply volume.</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/70 bg-white/70 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Human queue</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{snapshot.task_queue.length}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">Open actions that still need counselor or ops ownership.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.18fr,0.82fr]">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardDescription>Hot leads</CardDescription>
                <CardTitle>Parents already near a human-assisted conversion moment</CardTitle>
              </div>
              <Link
                href="/dashboard/leads"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                View leads
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {snapshot.hot_leads.length > 0 ? (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200/80 text-slate-500">
                  <tr>
                    <th className="pb-4 font-medium">Lead</th>
                    <th className="pb-4 font-medium">Score</th>
                    <th className="pb-4 font-medium">Stage</th>
                    <th className="pb-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {snapshot.hot_leads.map((lead) => (
                    <tr key={lead.id} className="align-top">
                      <td className="py-4 pr-4">
                        <Link href={`/dashboard/leads/${lead.id}`} className="font-semibold text-slate-950 transition hover:text-teal-800">
                          {getLeadDisplayName(lead.student_name, lead.parent_name)}
                        </Link>
                        <div className="mt-1 text-slate-500">{lead.parent_phone}</div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="inline-flex rounded-full border border-[rgba(179,132,67,0.22)] bg-[rgba(179,132,67,0.08)] px-3 py-1.5 font-semibold text-[rgb(120,83,34)]">
                          {lead.lead_score}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
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
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                No hot leads yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] border border-[rgba(15,118,110,0.15)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardDescription>Task queue</CardDescription>
                <CardTitle>Actions that protect momentum this week</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.task_queue.length > 0 ? (
              snapshot.task_queue.map((task) => (
                <div key={task.id} className="rounded-[1.45rem] border border-slate-200/80 bg-white/65 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-950">{humanizeToken(task.task_type)}</div>
                      <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{humanizeToken(task.status)}</div>
                    </div>
                    <Badge variant={task.priority === "urgent" ? "danger" : task.priority === "high" ? "warning" : "info"}>
                      {task.priority}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{task.notes}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                No human follow-up tasks are queued yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] border border-[rgba(179,132,67,0.18)] bg-[rgba(179,132,67,0.08)] p-2 text-[rgb(120,83,34)]">
                <Megaphone className="h-4 w-4" />
              </div>
              <div>
                <CardDescription>Campaign performance</CardDescription>
                <CardTitle>Current outbound batches and response shape</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.campaigns.length > 0 ? (
              snapshot.campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-[1.45rem] border border-slate-200/80 bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{campaign.template_name}</div>
                      <div className="mt-1 text-base font-semibold text-slate-950">{campaign.name}</div>
                    </div>
                    <Badge variant="neutral">{humanizeToken(campaign.status)}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="rounded-2xl bg-slate-50/80 px-3 py-2">Sent: {campaign.sent_count}</div>
                    <div className="rounded-2xl bg-slate-50/80 px-3 py-2">Replies: {campaign.reply_count}</div>
                    <div className="rounded-2xl bg-slate-50/80 px-3 py-2">Qualified: {campaign.qualified_count}</div>
                    <div className="rounded-2xl bg-slate-50/80 px-3 py-2">Payments: {campaign.payment_count}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                No campaigns are available yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardDescription>Branch command map</CardDescription>
                <CardTitle>Which branches look closest to conversion-ready</CardTitle>
              </div>
              <Link
                href="/dashboard/branches"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                Branches
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {topBranches.length > 0 ? (
              topBranches.map((branch) => {
                const occupancy = branch.capacity_available > 0 ? Math.max(10, Math.min(100, branch.hot_leads * 12)) : 10;

                return (
                  <div key={branch.branch_id} className="rounded-[1.45rem] border border-slate-200/80 bg-white/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                            <Landmark className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-950">{branch.name}</div>
                            <div className="text-sm text-slate-500">{branch.district}</div>
                          </div>
                        </div>
                      </div>
                      <Badge variant={branch.hot_leads > 0 ? "success" : "neutral"}>{branch.hot_leads} hot leads</Badge>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Seat locks</div>
                        <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">{branch.seat_locked}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Seats open</div>
                        <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">{branch.capacity_available}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Demand signal</div>
                        <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">{occupancy}%</div>
                      </div>
                    </div>

                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#b38443)]"
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                No branch performance data available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
        <Card>
          <CardHeader>
            <CardDescription>Recent activity</CardDescription>
            <CardTitle>Live event trail across the funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.recent_events.length > 0 ? (
              snapshot.recent_events.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="mt-1 h-3 w-3 rounded-full bg-[rgb(179,132,67)]" />
                    {index < snapshot.recent_events.length - 1 ? <div className="mt-2 h-full w-px bg-slate-200" /> : null}
                  </div>
                  <div className="flex-1 rounded-[1.35rem] border border-slate-200/80 bg-white/70 p-4">
                    <div className="font-semibold text-slate-950">{event.lead_name}</div>
                    <div className="mt-1 text-sm text-slate-600">{humanizeToken(event.event_type)}</div>
                    <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {formatEventTimestamp(event.created_at)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                No events have been logged yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] border border-[rgba(15,118,110,0.15)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardDescription>Stage composition</CardDescription>
                <CardTitle>Full funnel distribution across active leads</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.stage_counts.map((item) => {
              const share = totalStageCount > 0 ? Math.round((item.count / totalStageCount) * 100) : 0;

              return (
                <div key={item.stage} className="rounded-[1.4rem] border border-slate-200/80 bg-white/70 p-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{humanizeToken(item.stage)}</div>
                  <div className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-slate-950">{item.count}</div>
                  <div className="mt-2 text-sm text-slate-500">{share}% of visible funnel</div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#133548,#b38443)]"
                      style={{ width: `${Math.max(share, item.count > 0 ? 10 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
