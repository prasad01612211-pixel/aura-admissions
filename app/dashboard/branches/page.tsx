import { Building2, CheckCheck, MapPinned, Radar } from "lucide-react";

import { DashboardPageIntro, DashboardSummaryStat } from "@/components/dashboard/page-intro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranchAnalyticsSnapshot } from "@/lib/data/analytics";
import { getPartnerBranchVerificationSnapshot } from "@/lib/data/partner-branches";

export default async function BranchAnalyticsPage() {
  const [snapshot, verificationSnapshot] = await Promise.all([getBranchAnalyticsSnapshot(), getPartnerBranchVerificationSnapshot()]);
  const highConfidence = verificationSnapshot.confidence_counts.find((item) => item.confidence === "high")?.count ?? 0;

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Branch intelligence"
        badge={snapshot.source_label}
        icon={Building2}
        title="Operational readiness across branches, intake quality, and verification work."
        description="This view helps the team decide where to push demand, where trust signals are strong, and which branch records still need verification before they can be used confidently in live admissions."
        stats={[
          { label: "Visible branches", value: snapshot.rows.length.toLocaleString(), helper: "Branches currently represented in analytics." },
          { label: "Verification rows", value: verificationSnapshot.total_rows.toLocaleString(), helper: "Imported branch records awaiting review or mapping." },
          { label: "High confidence", value: highConfidence.toLocaleString(), helper: "Rows most likely ready for quick resolution." },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <DashboardSummaryStat label="Verification rows" value={verificationSnapshot.total_rows.toLocaleString()} />
        <DashboardSummaryStat label="Matched branches" value={verificationSnapshot.matched_rows.toLocaleString()} />
        <DashboardSummaryStat label="High confidence" value={highConfidence.toLocaleString()} />
        <DashboardSummaryStat label="Import batches" value={verificationSnapshot.import_batches.length.toLocaleString()} />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardDescription>Branch analytics</CardDescription>
              <CardTitle>Lead mix, conversion movement, and seat visibility by branch</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-3 py-2 text-sm text-teal-800">
                <Radar className="h-4 w-4" />
                Demand signal
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(179,132,67,0.22)] bg-[rgba(179,132,67,0.08)] px-3 py-2 text-sm text-[rgb(120,83,34)]">
                <MapPinned className="h-4 w-4" />
                Branch control
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto rounded-[1.5rem] border border-white/70 bg-white/72 p-3">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200/80 text-slate-500">
              <tr>
                <th className="pb-4 pt-1 font-medium">Branch</th>
                <th className="pb-4 pt-1 font-medium">Leads</th>
                <th className="pb-4 pt-1 font-medium">Qualified</th>
                <th className="pb-4 pt-1 font-medium">Hot</th>
                <th className="pb-4 pt-1 font-medium">Callbacks / Visits</th>
                <th className="pb-4 pt-1 font-medium">Payments</th>
                <th className="pb-4 pt-1 font-medium">Won</th>
                <th className="pb-4 pt-1 font-medium">Seats open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {snapshot.rows.map((branch) => (
                <tr key={branch.branch_id} className="align-top">
                  <td className="py-4 pr-4">
                    <div className="font-semibold text-slate-950">{branch.name}</div>
                    <div className="mt-1 text-slate-500">
                      {branch.city}, {branch.district}
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">{branch.total_leads.toLocaleString()}</td>
                  <td className="py-4 pr-4 text-slate-600">{branch.qualified_leads.toLocaleString()}</td>
                  <td className="py-4 pr-4 text-slate-600">{branch.hot_leads.toLocaleString()}</td>
                  <td className="py-4 pr-4 text-slate-600">
                    <div>Callbacks: {branch.callback_requested.toLocaleString()}</div>
                    <div className="mt-1">Visits: {branch.visit_requested.toLocaleString()}</div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">
                    <div>Pending: {branch.payment_pending.toLocaleString()}</div>
                    <div className="mt-1">Seat locked: {branch.seat_locked.toLocaleString()}</div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">
                    <div>{branch.admissions_won.toLocaleString()}</div>
                    <div className="mt-1 text-xs text-slate-400">{branch.conversion_rate}% conversion</div>
                  </td>
                  <td className="py-4 text-slate-600">{branch.capacity_available.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {snapshot.rows.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No branch analytics are available yet.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardDescription>Partner branch verification queue</CardDescription>
              <CardTitle>{verificationSnapshot.source_label}</CardTitle>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700">
              <CheckCheck className="h-4 w-4" />
              Review-ready queue
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            {verificationSnapshot.status_counts.map((item) => (
              <div key={item.status} className="rounded-full border border-white/70 bg-white/72 px-3 py-2">
                {item.status}: {item.count.toLocaleString()}
              </div>
            ))}
            {verificationSnapshot.confidence_counts.map((item) => (
              <div key={item.confidence} className="rounded-full border border-white/70 bg-white/72 px-3 py-2">
                {item.confidence}: {item.count.toLocaleString()}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-[1.5rem] border border-white/70 bg-white/72 p-3">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200/80 text-slate-500">
                <tr>
                  <th className="pb-4 pt-1 font-medium">Institution</th>
                  <th className="pb-4 pt-1 font-medium">State / District</th>
                  <th className="pb-4 pt-1 font-medium">City / Area</th>
                  <th className="pb-4 pt-1 font-medium">Pincode</th>
                  <th className="pb-4 pt-1 font-medium">Confidence</th>
                  <th className="pb-4 pt-1 font-medium">Status</th>
                  <th className="pb-4 pt-1 font-medium">Matched branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {verificationSnapshot.rows.slice(0, 50).map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-slate-950">{row.institution_display_name ?? row.institution_name}</div>
                      <div className="mt-1 text-slate-500">{row.import_batch_source_name ?? "local-master"}</div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">
                      <div>{row.state}</div>
                      <div className="mt-1 text-slate-500">{row.district}</div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">
                      <div>
                        {row.city}, {row.area}
                      </div>
                      <div className="mt-1 max-w-md text-xs text-slate-500">{row.address}</div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">{row.pincode ?? "-"}</td>
                    <td className="py-4 pr-4 text-slate-600">
                      <div>{row.confidence}</div>
                      <div className="mt-1 text-xs text-slate-500">{row.location_type}</div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">
                      <div>{row.verification_status}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.branch_verification_status ? `branch ${row.branch_verification_status}` : row.source_url ? "source linked" : "source missing"}
                      </div>
                    </td>
                    <td className="py-4 text-slate-600">
                      {row.existing_branch_name ? (
                        <div>
                          <div className="font-semibold text-slate-950">{row.existing_branch_name}</div>
                          <div className="mt-1 text-xs text-slate-500">{row.existing_branch_code}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">No match yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {verificationSnapshot.rows.length > 50 ? (
            <div className="text-xs text-slate-500">
              Showing first 50 rows. Import into Supabase to review the full queue with persisted statuses.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
