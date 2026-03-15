import Link from "next/link";
import { Landmark, Link2, ShieldCheck } from "lucide-react";

import { DashboardPageIntro, DashboardSummaryStat } from "@/components/dashboard/page-intro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInstitutionSnapshot } from "@/lib/data/institutions";
import { formatCurrency, humanizeToken } from "@/lib/utils";

export default async function InstitutionsPage() {
  const snapshot = await getInstitutionSnapshot();
  const totalBranches = snapshot.rows.reduce((sum, row) => sum + row.branch_count, 0);

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Institution network"
        badge={snapshot.source_label}
        icon={Landmark}
        title="A cleaner institutional view of branches, commission logic, and payout readiness."
        description="This page keeps partner institutions commercially legible: how many branches are active, what the commission rules look like, and how much payout movement is already in play."
        stats={[
          { label: "Institutions", value: snapshot.rows.length.toLocaleString(), helper: "Partner institutions currently visible in the network." },
          { label: "Mapped branches", value: totalBranches.toLocaleString(), helper: "Total branch footprint associated with those institutions." },
          { label: "Commission-linked", value: snapshot.rows.filter((row) => row.current_commission !== null).length.toLocaleString(), helper: "Institutions with an active commission configuration." },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardSummaryStat label="Institutions" value={snapshot.rows.length.toLocaleString()} />
        <DashboardSummaryStat label="Branches" value={totalBranches.toLocaleString()} />
        <DashboardSummaryStat
          label="Configured commission"
          value={snapshot.rows.filter((row) => row.current_commission !== null).length.toLocaleString()}
          helper="Institutions where payout rules are already defined."
        />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardDescription>Institution operating model</CardDescription>
              <CardTitle>Commission design, conversion progress, and payout posture</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-3 py-2 text-sm text-teal-800">
                <ShieldCheck className="h-4 w-4" />
                Commercial visibility
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700">
                <Link2 className="h-4 w-4" />
                Branch-linked
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
                <th className="pb-4 pt-1 font-medium">Commission</th>
                <th className="pb-4 pt-1 font-medium">Trigger</th>
                <th className="pb-4 pt-1 font-medium">Confirmed</th>
                <th className="pb-4 pt-1 font-medium">Eligible</th>
                <th className="pb-4 pt-1 font-medium">Payouts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {snapshot.rows.map((row) => (
                <tr key={row.institution_id} className="align-top">
                  <td className="py-4 pr-4">
                    <div className="font-semibold text-slate-950">{row.institution_name}</div>
                    {row.website_url ? (
                      <Link href={row.website_url} className="mt-1 inline-block text-xs text-teal-700 hover:text-teal-800" target="_blank">
                        {row.website_url}
                      </Link>
                    ) : (
                      <div className="mt-1 text-xs text-slate-400">No public website mapped</div>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-slate-600">{row.branch_count.toLocaleString()}</td>
                  <td className="py-4 pr-4 text-slate-600">{row.current_commission !== null ? formatCurrency(row.current_commission) : "Pending setup"}</td>
                  <td className="py-4 pr-4 text-slate-600">{row.commission_trigger ? humanizeToken(row.commission_trigger) : "Pending setup"}</td>
                  <td className="py-4 pr-4 text-slate-600">{row.admissions_confirmed.toLocaleString()}</td>
                  <td className="py-4 pr-4 text-slate-600">{row.commission_eligible.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">
                    <div>Pending: {row.pending_payouts.toLocaleString()}</div>
                    <div className="mt-1 text-xs text-slate-400">Paid: {row.paid_payouts.toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {snapshot.rows.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No institution records are available yet.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
