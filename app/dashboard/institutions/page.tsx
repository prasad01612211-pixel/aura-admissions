import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInstitutionSnapshot } from "@/lib/data/institutions";
import { formatCurrency, humanizeToken } from "@/lib/utils";

export default async function InstitutionsPage() {
  const snapshot = await getInstitutionSnapshot();

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardDescription>Institution operating model</CardDescription>
          <CardTitle>{snapshot.source_label}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Institution</th>
                <th className="pb-3 font-medium">Branches</th>
                <th className="pb-3 font-medium">Commission</th>
                <th className="pb-3 font-medium">Trigger</th>
                <th className="pb-3 font-medium">Confirmed</th>
                <th className="pb-3 font-medium">Eligible</th>
                <th className="pb-3 font-medium">Payouts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {snapshot.rows.map((row) => (
                <tr key={row.institution_id}>
                  <td className="py-4">
                    <div className="font-medium text-slate-950">{row.institution_name}</div>
                    {row.website_url ? (
                      <Link href={row.website_url} className="text-xs text-sky-700 hover:text-sky-800" target="_blank">
                        {row.website_url}
                      </Link>
                    ) : (
                      <div className="text-xs text-slate-400">No public website mapped</div>
                    )}
                  </td>
                  <td className="py-4 text-slate-600">{row.branch_count.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">
                    {row.current_commission !== null ? formatCurrency(row.current_commission) : "Pending setup"}
                  </td>
                  <td className="py-4 text-slate-600">{row.commission_trigger ? humanizeToken(row.commission_trigger) : "Pending setup"}</td>
                  <td className="py-4 text-slate-600">{row.admissions_confirmed.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">{row.commission_eligible.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">
                    <div>Pending: {row.pending_payouts.toLocaleString()}</div>
                    <div className="text-xs text-slate-400">Paid: {row.paid_payouts.toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {snapshot.rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No institution records are available yet.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
