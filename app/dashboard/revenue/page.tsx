import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRevenueSnapshot } from "@/lib/data/revenue";
import { formatCurrency, formatDateTime, humanizeToken } from "@/lib/utils";

export default async function RevenuePage() {
  const snapshot = await getRevenueSnapshot();

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        {snapshot.summary.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle>{item.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-500">{item.helper}</CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Institution payout summary</CardDescription>
          <CardTitle>{snapshot.source_label}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Institution</th>
                <th className="pb-3 font-medium">Branches</th>
                <th className="pb-3 font-medium">Confirmed</th>
                <th className="pb-3 font-medium">Eligible</th>
                <th className="pb-3 font-medium">Ready / Invoiced</th>
                <th className="pb-3 font-medium">Received</th>
                <th className="pb-3 font-medium">Open rows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {snapshot.institutions.map((row) => (
                <tr key={row.institution_id}>
                  <td className="py-4 font-medium text-slate-950">{row.institution_name}</td>
                  <td className="py-4 text-slate-600">{row.branches.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">{row.admissions_confirmed.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">{row.commission_eligible.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">{formatCurrency(row.pending_amount)}</td>
                  <td className="py-4 text-slate-600">{formatCurrency(row.paid_amount)}</td>
                  <td className="py-4 text-slate-600">{row.due_count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Commission ledger</CardDescription>
          <CardTitle>Ready, received, and disputed payout rows</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Institution</th>
                <th className="pb-3 font-medium">Branch</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Due / Received</th>
                <th className="pb-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {snapshot.payouts.map((row) => (
                <tr key={row.payout_id}>
                  <td className="py-4 font-medium text-slate-950">{row.institution_name}</td>
                  <td className="py-4 text-slate-600">{row.branch_name ?? "Institution-level"}</td>
                  <td className="py-4 text-slate-600">{formatCurrency(row.gross_amount)}</td>
                  <td className="py-4 text-slate-600">{humanizeToken(row.status)}</td>
                  <td className="py-4 text-slate-600">
                    {row.status === "received" && row.paid_at ? formatDateTime(row.paid_at) : row.due_at ? formatDateTime(row.due_at) : "—"}
                  </td>
                  <td className="py-4 text-slate-600">{row.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {snapshot.payouts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No payout ledger rows are available yet.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
