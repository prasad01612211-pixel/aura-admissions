import Link from "next/link";
import { AlertCircle, PhoneCall, Radar, TrendingUp, UserRound, WalletCards } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConversionEngineSnapshot } from "@/types/domain";

function formatMinutes(value: number | null) {
  if (value === null) {
    return "No data";
  }

  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function buildLeadListHref(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/dashboard/leads?${searchParams.toString()}`;
}

export function ConversionEnginePanel({ snapshot }: { snapshot: ConversionEngineSnapshot }) {
  const slaCards = [
    {
      label: "At-risk leads",
      value: snapshot.sla.at_risk_leads.toLocaleString(),
      helper: "Leads that have crossed the current human-touch SLA for their stage.",
      icon: AlertCircle,
      tone: "attention",
      href: buildLeadListHref({ atRisk: "1" }),
    },
    {
      label: "Overdue callbacks",
      value: snapshot.sla.overdue_callbacks.toLocaleString(),
      helper: "Callback tasks already behind the promised response window.",
      icon: PhoneCall,
      tone: "attention",
      href: buildLeadListHref({ callback: "1", overdueCallback: "1" }),
    },
    {
      label: "Payment recovery queue",
      value: snapshot.sla.payment_recovery_queue.toLocaleString(),
      helper: "Leads that need commercial follow-up before the payment moment cools off.",
      icon: WalletCards,
      tone: "positive",
      href: buildLeadListHref({ paymentRecovery: "1" }),
    },
    {
      label: "Unowned hot leads",
      value: snapshot.sla.unowned_hot_leads.toLocaleString(),
      helper: "High-intent leads without a clear owner yet.",
      icon: UserRound,
      tone: "attention",
      href: buildLeadListHref({ hot: "1", unowned: "1" }),
    },
  ] as const;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {slaCards.map((card) => {
          const Icon = card.icon;
          const iconClass =
            card.tone === "attention"
              ? "border-amber-200/70 bg-[rgba(245,158,11,0.08)] text-amber-700"
              : "border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] text-teal-700";

          return (
            <Link key={card.label} href={card.href} className="block transition hover:-translate-y-0.5 hover:opacity-95">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
                  <div>
                    <CardDescription className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">{card.label}</CardDescription>
                    <CardTitle className="mt-3 text-[2rem] leading-none tracking-[-0.06em]">{card.value}</CardTitle>
                  </div>
                  <div className={`rounded-[1.1rem] border p-3 ${iconClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-slate-600">{card.helper}</p>
                  <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Open filtered lead list</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                <UserRound className="h-4 w-4" />
              </div>
              <div>
                <CardDescription>Counselor execution</CardDescription>
                <CardTitle>Who owns momentum right now</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto rounded-[1.5rem] border border-white/70 bg-white/72 p-3">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200/80 text-slate-500">
                <tr>
                  <th className="pb-4 pt-1 font-medium">Owner</th>
                  <th className="pb-4 pt-1 font-medium">Owned</th>
                  <th className="pb-4 pt-1 font-medium">Hot</th>
                  <th className="pb-4 pt-1 font-medium">Open / Overdue</th>
                  <th className="pb-4 pt-1 font-medium">Callback / Payment</th>
                  <th className="pb-4 pt-1 font-medium">Won</th>
                  <th className="pb-4 pt-1 font-medium text-right">Queue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {snapshot.counselor_rows.map((row) => (
                  <tr key={row.user_id} className="align-top">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-slate-950">{row.name}</div>
                      <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">{row.role}</div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">
                      <div>{row.owned_leads.toLocaleString()}</div>
                      <div className="mt-1 text-xs text-slate-400">{row.close_rate}% close rate</div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">
                      <div>{row.hot_leads.toLocaleString()}</div>
                      <div className="mt-1 text-xs text-slate-400">{row.stale_leads.toLocaleString()} stale</div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">
                      <div>{row.open_tasks.toLocaleString()} open</div>
                      <div className="mt-1 text-xs text-slate-400">{row.overdue_tasks.toLocaleString()} overdue</div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">
                      <div>{row.callback_tasks.toLocaleString()} callbacks</div>
                      <div className="mt-1 text-xs text-slate-400">{row.payment_followups.toLocaleString()} payments</div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">{row.won_leads.toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <Link
                        href={buildLeadListHref({ owner: row.user_id })}
                        className="inline-flex rounded-full border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                      >
                        Open queue
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {snapshot.counselor_rows.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                No operator scorecards are available yet. Add users and owner assignments to activate this view.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] border border-[rgba(179,132,67,0.22)] bg-[rgba(179,132,67,0.08)] p-2 text-[rgb(120,83,34)]">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <CardDescription>Source yield</CardDescription>
                <CardTitle>Which inputs are creating real admissions energy</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.35rem] border border-white/70 bg-white/72 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Outreach coverage</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  {snapshot.sla.outreach_coverage_rate.toLocaleString()}%
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600">Active leads that have already received at least one outbound touch.</div>
              </div>
              <div className="rounded-[1.35rem] border border-white/70 bg-white/72 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Median outreach latency</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  {formatMinutes(snapshot.sla.median_initial_outreach_minutes)}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600">Time from lead creation to first outbound touch across leads with visible outreach.</div>
              </div>
            </div>

            <div className="space-y-3">
              {snapshot.source_rows.map((row) => (
                <div key={row.source_key} className="rounded-[1.35rem] border border-slate-200/80 bg-white/72 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-950">{row.source_key}</div>
                      <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">{row.source_channel}</div>
                    </div>
                    <div className="rounded-full border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
                      {row.conversion_rate}% won
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <div>Total leads: {row.total_leads.toLocaleString()}</div>
                    <div>Qualified: {row.qualified_leads.toLocaleString()}</div>
                    <div>Hot: {row.hot_leads.toLocaleString()}</div>
                    <div>Payment pending: {row.payment_pending.toLocaleString()}</div>
                    <div>Seat locked: {row.seat_locked.toLocaleString()}</div>
                    <div>Avg score: {row.avg_lead_score.toLocaleString()}</div>
                  </div>
                  <div className="mt-4">
                    <Link
                      href={buildLeadListHref({ source: row.source_key })}
                      className="inline-flex rounded-full border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      Open source leads
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {snapshot.source_rows.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                No source performance rows are available yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/70 bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(255,248,240,0.8))]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-[1rem] border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
              <Radar className="h-4 w-4" />
            </div>
            <div>
              <CardDescription>Why this matters</CardDescription>
              <CardTitle>From reporting product to conversion engine</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-7 text-slate-600 md:grid-cols-3">
          <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
            The SLA layer tells the team where speed is already costing admissions momentum.
          </div>
          <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
            The counselor layer makes ownership, overload, and close potential visible instead of anecdotal.
          </div>
          <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
            The source layer shows which campaigns and channels deserve more budget because they actually move students deeper.
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
