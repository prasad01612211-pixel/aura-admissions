import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranchAnalyticsSnapshot } from "@/lib/data/analytics";
import { getPartnerBranchVerificationSnapshot } from "@/lib/data/partner-branches";

export default async function BranchAnalyticsPage() {
  const [snapshot, verificationSnapshot] = await Promise.all([
    getBranchAnalyticsSnapshot(),
    getPartnerBranchVerificationSnapshot(),
  ]);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardDescription>Branch analytics</CardDescription>
          <CardTitle>{snapshot.source_label}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Branch</th>
                <th className="pb-3 font-medium">Leads</th>
                <th className="pb-3 font-medium">Qualified</th>
                <th className="pb-3 font-medium">Hot</th>
                <th className="pb-3 font-medium">Callbacks / Visits</th>
                <th className="pb-3 font-medium">Payments</th>
                <th className="pb-3 font-medium">Won</th>
                <th className="pb-3 font-medium">Seats open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {snapshot.rows.map((branch) => (
                <tr key={branch.branch_id}>
                  <td className="py-4">
                    <div className="font-medium text-slate-950">{branch.name}</div>
                    <div className="text-slate-500">
                      {branch.city}, {branch.district}
                    </div>
                  </td>
                  <td className="py-4 text-slate-600">{branch.total_leads.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">{branch.qualified_leads.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">{branch.hot_leads.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">
                    <div>Callbacks: {branch.callback_requested.toLocaleString()}</div>
                    <div>Visits: {branch.visit_requested.toLocaleString()}</div>
                  </td>
                  <td className="py-4 text-slate-600">
                    <div>Pending: {branch.payment_pending.toLocaleString()}</div>
                    <div>Seat locked: {branch.seat_locked.toLocaleString()}</div>
                  </td>
                  <td className="py-4 text-slate-600">
                    <div>{branch.admissions_won.toLocaleString()}</div>
                    <div className="text-xs text-slate-400">{branch.conversion_rate}% conversion</div>
                  </td>
                  <td className="py-4 text-slate-600">{branch.capacity_available.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {snapshot.rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No branch analytics are available yet.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Partner branch verification queue</CardDescription>
          <CardTitle>{verificationSnapshot.source_label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Rows</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {verificationSnapshot.total_rows.toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Matched branches</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {verificationSnapshot.matched_rows.toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">High confidence</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {(verificationSnapshot.confidence_counts.find((item) => item.confidence === "high")?.count ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Batches</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {verificationSnapshot.import_batches.length.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            {verificationSnapshot.status_counts.map((item) => (
              <div key={item.status} className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {item.status}: {item.count.toLocaleString()}
              </div>
            ))}
            {verificationSnapshot.confidence_counts.map((item) => (
              <div key={item.confidence} className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {item.confidence}: {item.count.toLocaleString()}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Institution</th>
                  <th className="pb-3 font-medium">State / District</th>
                  <th className="pb-3 font-medium">City / Area</th>
                  <th className="pb-3 font-medium">Pincode</th>
                  <th className="pb-3 font-medium">Confidence</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Matched branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {verificationSnapshot.rows.slice(0, 50).map((row) => (
                  <tr key={row.id}>
                    <td className="py-4 align-top">
                      <div className="font-medium text-slate-950">{row.institution_display_name ?? row.institution_name}</div>
                      <div className="text-slate-500">{row.import_batch_source_name ?? "local-master"}</div>
                    </td>
                    <td className="py-4 align-top text-slate-600">
                      <div>{row.state}</div>
                      <div className="text-slate-500">{row.district}</div>
                    </td>
                    <td className="py-4 align-top text-slate-600">
                      <div>
                        {row.city}, {row.area}
                      </div>
                      <div className="max-w-md text-xs text-slate-500">{row.address}</div>
                    </td>
                    <td className="py-4 align-top text-slate-600">{row.pincode ?? "—"}</td>
                    <td className="py-4 align-top text-slate-600">
                      <div>{row.confidence}</div>
                      <div className="text-xs text-slate-500">{row.location_type}</div>
                    </td>
                    <td className="py-4 align-top text-slate-600">
                      <div>{row.verification_status}</div>
                      <div className="text-xs text-slate-500">
                        {row.branch_verification_status ? `branch ${row.branch_verification_status}` : row.source_url ? "source linked" : "source missing"}
                      </div>
                    </td>
                    <td className="py-4 align-top text-slate-600">
                      {row.existing_branch_name ? (
                        <div>
                          <div className="font-medium text-slate-950">{row.existing_branch_name}</div>
                          <div className="text-xs text-slate-500">{row.existing_branch_code}</div>
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
