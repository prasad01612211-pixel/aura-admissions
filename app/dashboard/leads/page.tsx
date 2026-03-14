import Link from "next/link";

import { LeadStageBadge, LeadStatusBadge } from "@/components/dashboard/state-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadList, type LeadListFilters } from "@/lib/data/leads";
import { formatDateTime, getLeadDisplayName, humanizeToken } from "@/lib/utils";

type LeadListPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const defaultPageSize = 100;

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LeadListPage({ searchParams }: LeadListPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = Math.max(1, Number(getSingleValue(resolvedSearchParams.page) ?? "1") || 1);
  const filters: LeadListFilters = {
    stage: getSingleValue(resolvedSearchParams.stage) as LeadListFilters["stage"],
    status: getSingleValue(resolvedSearchParams.status) as LeadListFilters["status"],
    branch: getSingleValue(resolvedSearchParams.branch),
    campaign: getSingleValue(resolvedSearchParams.campaign),
    onlyHot: getSingleValue(resolvedSearchParams.hot) === "1",
    callbackRequested: getSingleValue(resolvedSearchParams.callback) === "1",
    visitRequested: getSingleValue(resolvedSearchParams.visit) === "1",
    paymentPending: getSingleValue(resolvedSearchParams.payment) === "1",
    dateFrom: getSingleValue(resolvedSearchParams.dateFrom),
    dateTo: getSingleValue(resolvedSearchParams.dateTo),
    page,
    pageSize: defaultPageSize,
  };

  const {
    leads,
    branches,
    campaigns,
    total,
    page: currentPage,
    pageSize,
    totalPages,
    hotCount,
    paymentPendingCount,
    dataSource,
    sourceLabel,
  } = await getLeadList(filters);
  const branchLookup = new Map(branches.map((branch) => [branch.id, branch.name]));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, rangeStart + leads.length - 1);
  const dataSourceLabel =
    dataSource === "local_import" ? "Local import" : dataSource === "supabase" ? "Supabase" : "Demo seed data";

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();

    if (filters.stage) params.set("stage", filters.stage);
    if (filters.status) params.set("status", filters.status);
    if (filters.branch) params.set("branch", filters.branch);
    if (filters.campaign) params.set("campaign", filters.campaign);
    if (filters.onlyHot) params.set("hot", "1");
    if (filters.callbackRequested) params.set("callback", "1");
    if (filters.visitRequested) params.set("visit", "1");
    if (filters.paymentPending) params.set("payment", "1");
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (targetPage > 1) params.set("page", String(targetPage));

    const query = params.toString();
    return query ? `/dashboard/leads?${query}` : "/dashboard/leads";
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[1fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardDescription>Lead data source</CardDescription>
            <CardTitle>{sourceLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-medium text-slate-950">Active mode</div>
              <div className="mt-2">{dataSourceLabel}</div>
              <div className="mt-1 text-slate-500">Supported imports: .csv, .xls, .xlsx</div>
            </div>
            <p>The import flow normalizes district and phone values, removes duplicates, and keeps the latest local import visible in the dashboard when Supabase is not configured.</p>
            <div className="flex flex-wrap gap-3">
              <code className="rounded-2xl bg-slate-950 px-4 py-3 text-xs text-slate-100">POST /api/leads/import</code>
              <code className="rounded-2xl bg-slate-950 px-4 py-3 text-xs text-slate-100">POST /api/branches/recommend</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Filtered lead count</CardDescription>
            <CardTitle>{total.toLocaleString()} leads matched</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Showing</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {rangeStart.toLocaleString()}-{rangeEnd.toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Page</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {currentPage.toLocaleString()} / {totalPages.toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Hot or priority</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{hotCount.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Payment pending</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{paymentPendingCount.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Lead filters</CardDescription>
          <CardTitle>Slice the queue by intent and branch</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Stage</span>
              <select name="stage" defaultValue={filters.stage ?? ""} className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4">
                <option value="">All stages</option>
                <option value="imported">Imported</option>
                <option value="replied">Replied</option>
                <option value="qualified">Qualified</option>
                <option value="callback_requested">Callback requested</option>
                <option value="visit_requested">Visit requested</option>
                <option value="payment_pending">Payment pending</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Status</span>
              <select name="status" defaultValue={filters.status ?? ""} className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4">
                <option value="">All statuses</option>
                <option value="new">New</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
                <option value="followup">Follow-up</option>
                <option value="won">Won</option>
                <option value="duplicate">Duplicate</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Branch</span>
              <select name="branch" defaultValue={filters.branch ?? ""} className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4">
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Campaign</span>
              <select name="campaign" defaultValue={filters.campaign ?? ""} className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4">
                <option value="">All campaigns</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.source_batch ?? campaign.name}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-3">
              <button type="submit" className={buttonVariants({ className: "flex-1" })}>
                Apply
              </button>
              <Link href="/dashboard/leads" className={buttonVariants({ variant: "outline" })}>
                Reset
              </Link>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <input type="checkbox" name="hot" value="1" defaultChecked={filters.onlyHot} />
              Hot leads
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <input type="checkbox" name="callback" value="1" defaultChecked={filters.callbackRequested} />
              Callback requested
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <input type="checkbox" name="visit" value="1" defaultChecked={filters.visitRequested} />
              Visit requested
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <input type="checkbox" name="payment" value="1" defaultChecked={filters.paymentPending} />
              Payment pending
            </label>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Lead queue</CardDescription>
          <CardTitle>Fast triage view for the admissions team</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Lead</th>
                <th className="pb-3 font-medium">Location</th>
                <th className="pb-3 font-medium">Branch</th>
                <th className="pb-3 font-medium">Stage</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Score</th>
                <th className="pb-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="py-4">
                    <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-slate-950 hover:text-sky-700">
                      {getLeadDisplayName(lead.student_name, lead.parent_name)}
                    </Link>
                    <div className="text-slate-500">{lead.parent_phone ?? lead.student_phone}</div>
                    <div className="text-xs text-slate-400">{humanizeToken(lead.utm_campaign ?? "manual")}</div>
                  </td>
                  <td className="py-4 text-slate-600">
                    <div>{lead.city ?? "Unknown city"}</div>
                    <div className="text-xs text-slate-400">{lead.district ?? "Unknown district"}</div>
                  </td>
                  <td className="py-4 text-slate-600">
                    {branchLookup.get(lead.assigned_branch_id ?? lead.preferred_branch_id ?? "") ?? "Unassigned"}
                  </td>
                  <td className="py-4">
                    <LeadStageBadge stage={lead.stage} />
                  </td>
                  <td className="py-4">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td className="py-4 font-semibold text-slate-950">{lead.lead_score}</td>
                  <td className="py-4 text-slate-500">{formatDateTime(lead.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No leads match the selected filters.
            </div>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Showing {rangeStart.toLocaleString()}-{rangeEnd.toLocaleString()} of {total.toLocaleString()} leads
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={buildPageHref(Math.max(1, currentPage - 1))}
                className={buttonVariants({
                  variant: "outline",
                  className: currentPage <= 1 ? "pointer-events-none opacity-50" : "",
                })}
              >
                Previous
              </Link>
              <span>
                Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
              </span>
              <Link
                href={buildPageHref(Math.min(totalPages, currentPage + 1))}
                className={buttonVariants({
                  variant: "outline",
                  className: currentPage >= totalPages ? "pointer-events-none opacity-50" : "",
                })}
              >
                Next
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
