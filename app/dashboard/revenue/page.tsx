import { IndianRupee, Landmark, ReceiptText, Wallet } from "lucide-react";

import { DashboardPageIntro } from "@/components/dashboard/page-intro";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDashboardOperator } from "@/lib/auth/operator";
import { getRevenueSnapshot } from "@/lib/data/revenue";
import { formatCurrency, formatDateTime, humanizeToken } from "@/lib/utils";

export default async function RevenuePage() {
  await requireDashboardOperator(["admin", "finance"]);
  const snapshot = await getRevenueSnapshot();

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Revenue command"
        badge={snapshot.source_label}
        icon={IndianRupee}
        title="Premium revenue visibility from confirmed admissions to payout ledger control."
        description="This view keeps the commercial side of admissions sharp: what is confirmed, what is eligible, what is ready to collect, and where payout rows still need operational attention."
        stats={[
          { label: "Institutions", value: snapshot.institutions.length.toLocaleString(), helper: "Partner institutions represented in payout reporting." },
          { label: "Ledger rows", value: snapshot.payouts.length.toLocaleString(), helper: "Payout entries currently visible in the commission ledger." },
          { label: "Source label", value: snapshot.source_label, helper: "Current revenue data source for this environment." },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {snapshot.summary.map((item) => (
          <MetricCard key={item.label} metric={{ ...item, tone: "neutral" }} />
        ))}
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardDescription>Institution payout summary</CardDescription>
              <CardTitle>Confirmed admissions, eligible rows, and pending value by institution</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-3 py-2 text-sm text-teal-800">
                <Landmark className="h-4 w-4" />
                Institution view
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(179,132,67,0.22)] bg-[rgba(179,132,67,0.08)] px-3 py-2 text-sm text-[rgb(120,83,34)]">
                <Wallet className="h-4 w-4" />
                Payout aware
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto rounded-[1.5rem] border border-white/70 bg-white/72 p-3">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200/80 text-slate-500">
              <tr>
                <th className="pb-4 pt-1 font-medium">Institution</th>
                <th className="pb-4 pt-1 font-medium">Branches</th>
                <th className="pb-4 pt-1 font-medium">Confirmed</th>
                <th className="pb-4 pt-1 font-medium">Eligible</th>
                <th className="pb-4 pt-1 font-medium">Ready / Invoiced</th>
                <th className="pb-4 pt-1 font-medium">Received</th>
                <th className="pb-4 pt-1 font-medium">Open rows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {snapshot.institutions.map((row) => (
                <tr key={row.institution_id} className="align-top">
                  <td className="py-4 pr-4 font-semibold text-slate-950">{row.institution_name}</td>
                  <td className="py-4 pr-4 text-slate-600">{row.branches.toLocaleString()}</td>
                  <td className="py-4 pr-4 text-slate-600">{row.admissions_confirmed.toLocaleString()}</td>
                  <td className="py-4 pr-4 text-slate-600">{row.commission_eligible.toLocaleString()}</td>
                  <td className="py-4 pr-4 text-slate-600">{formatCurrency(row.pending_amount)}</td>
                  <td className="py-4 pr-4 text-slate-600">{formatCurrency(row.paid_amount)}</td>
                  <td className="py-4 text-slate-600">{row.due_count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-[1rem] border border-[rgba(15,118,110,0.15)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
              <ReceiptText className="h-4 w-4" />
            </div>
            <div>
              <CardDescription>Commission ledger</CardDescription>
              <CardTitle>Ready, received, and disputed payout rows</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto rounded-[1.5rem] border border-white/70 bg-white/72 p-3">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200/80 text-slate-500">
              <tr>
                <th className="pb-4 pt-1 font-medium">Institution</th>
                <th className="pb-4 pt-1 font-medium">Branch</th>
                <th className="pb-4 pt-1 font-medium">Amount</th>
                <th className="pb-4 pt-1 font-medium">Status</th>
                <th className="pb-4 pt-1 font-medium">Due / Received</th>
                <th className="pb-4 pt-1 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {snapshot.payouts.map((row) => (
                <tr key={row.payout_id} className="align-top">
                  <td className="py-4 pr-4 font-semibold text-slate-950">{row.institution_name}</td>
                  <td className="py-4 pr-4 text-slate-600">{row.branch_name ?? "Institution-level"}</td>
                  <td className="py-4 pr-4 text-slate-600">{formatCurrency(row.gross_amount)}</td>
                  <td className="py-4 pr-4 text-slate-600">{humanizeToken(row.status)}</td>
                  <td className="py-4 pr-4 text-slate-600">
                    {row.status === "received" && row.paid_at ? formatDateTime(row.paid_at) : row.due_at ? formatDateTime(row.due_at) : "-"}
                  </td>
                  <td className="py-4 text-slate-600">{row.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {snapshot.payouts.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No payout ledger rows are available yet.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
