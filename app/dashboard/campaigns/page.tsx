import { Activity, Megaphone, MessageSquareReply, Target } from "lucide-react";

import { DashboardPageIntro, DashboardSummaryStat } from "@/components/dashboard/page-intro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDashboardOperator } from "@/lib/auth/operator";
import { getCampaignAnalyticsSnapshot } from "@/lib/data/analytics";

export default async function CampaignAnalyticsPage() {
  await requireDashboardOperator(["admin", "operations"]);
  const snapshot = await getCampaignAnalyticsSnapshot();
  const totalTargets = snapshot.rows.reduce((sum, row) => sum + row.target_count, 0);
  const totalReplies = snapshot.rows.reduce((sum, row) => sum + row.reply_count, 0);
  const totalQualified = snapshot.rows.reduce((sum, row) => sum + row.qualified_count, 0);

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Campaign analytics"
        badge={snapshot.source_label}
        icon={Megaphone}
        title="Outbound performance with premium visibility into reply quality and conversion shape."
        description="This view shows whether campaigns are doing real work: not just sending messages, but generating replies, qualification, payment intent, and admissions momentum."
        stats={[
          { label: "Campaign rows", value: snapshot.rows.length.toLocaleString(), helper: "Batches currently visible in analytics." },
          { label: "Target count", value: totalTargets.toLocaleString(), helper: "Total outreach volume represented in this view." },
          { label: "Replies", value: totalReplies.toLocaleString(), helper: "Direct parent response across the available batches." },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardSummaryStat label="Targeted" value={totalTargets.toLocaleString()} helper="Campaign reach currently in view." />
        <DashboardSummaryStat label="Replies" value={totalReplies.toLocaleString()} helper="Signal that the message and timing worked." />
        <DashboardSummaryStat label="Qualified" value={totalQualified.toLocaleString()} helper="Parents who moved beyond initial engagement." />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardDescription>Campaign analytics</CardDescription>
              <CardTitle>Reply, qualification, payment, and admission performance</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-3 py-2 text-sm text-teal-800">
                <MessageSquareReply className="h-4 w-4" />
                Reply-led
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(179,132,67,0.22)] bg-[rgba(179,132,67,0.08)] px-3 py-2 text-sm text-[rgb(120,83,34)]">
                <Target className="h-4 w-4" />
                Conversion-aware
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700">
                <Activity className="h-4 w-4" />
                Funnel impact
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto rounded-[1.5rem] border border-white/70 bg-white/72 p-3">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200/80 text-slate-500">
              <tr>
                <th className="pb-4 pt-1 font-medium">Campaign</th>
                <th className="pb-4 pt-1 font-medium">Target</th>
                <th className="pb-4 pt-1 font-medium">Replies</th>
                <th className="pb-4 pt-1 font-medium">Qualified</th>
                <th className="pb-4 pt-1 font-medium">Paid</th>
                <th className="pb-4 pt-1 font-medium">Won</th>
                <th className="pb-4 pt-1 font-medium">Rates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {snapshot.rows.map((campaign) => (
                <tr key={campaign.id} className="align-top">
                  <td className="py-4 pr-4">
                    <div className="font-semibold text-slate-950">{campaign.name}</div>
                    <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">{campaign.template_name}</div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">{campaign.target_count.toLocaleString()}</td>
                  <td className="py-4 pr-4 text-slate-600">
                    {campaign.reply_count.toLocaleString()}
                    <div className="mt-1 text-xs text-slate-400">{campaign.reply_rate}% reply rate</div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">
                    {campaign.qualified_count.toLocaleString()}
                    <div className="mt-1 text-xs text-slate-400">{campaign.qualification_rate}% qualification rate</div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">
                    {campaign.payment_count.toLocaleString()}
                    <div className="mt-1 text-xs text-slate-400">{campaign.payment_rate}% payment rate</div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">
                    {campaign.admission_count.toLocaleString()}
                    <div className="mt-1 text-xs text-slate-400">{campaign.admission_rate}% admission rate</div>
                  </td>
                  <td className="py-4 text-slate-600">
                    <div>Hot leads: {campaign.hot_leads.toLocaleString()}</div>
                    <div className="mt-1">Pending payments: {campaign.pending_payments.toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {snapshot.rows.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No campaigns are available yet.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
