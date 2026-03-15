import Link from "next/link";
import { Database, Filter, Flame, MapPinned, UsersRound } from "lucide-react";

import { DashboardPageIntro, DashboardSummaryStat } from "@/components/dashboard/page-intro";
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

  const { leads, branches, campaigns, total, page: currentPage, pageSize, totalPages, hotCount, paymentPendingCount, dataSource, sourceLabel } =
    await getLeadList(filters);
  const branchLookup = new Map(branches.map((branch) => [branch.id, branch.name]));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, rangeStart + leads.length - 1);
  const dataSourceLabel = dataSource === "local_import" ? "Local import" : dataSource === "supabase" ? "Supabase" : "Demo seed data";

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
      <DashboardPageIntro
        eyebrow="Lead command"
        badge={dataSourceLabel}
        icon={UsersRound}
        title="Premium triage view for admissions teams handling live parent intent."
        description="Filter the queue, isolate the high-value moments, and keep counselor focus on the leads most likely to move to visits, forms, and payment."
        stats={[
          { label: "Matched leads", value: total.toLocaleString(), helper: `Showing ${rangeStart.toLocaleString()}-${rangeEnd.toLocaleString()} right now.` },
          { label: "Hot queue", value: hotCount.toLocaleString(), helper: "Parents already worth human follow-up." },
          { label: "Payment pending", value: paymentPendingCount.toLocaleString(), helper: "Leads closest to conversion friction." },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardSummaryStat label="Source label" value={sourceLabel} helper="Current lead source visible inside the dashboard." />
        <DashboardSummaryStat label="Current page" value={`${currentPage.toLocaleString()} / ${totalPages.toLocaleString()}`} helper="Pagination stays aligned with active filters." />
        <DashboardSummaryStat label="Branch options" value={branches.length.toLocaleString()} helper="Branches available for assignment and filtering." />
        <DashboardSummaryStat label="Campaign options" value={campaigns.length.toLocaleString()} helper="Campaigns currently visible in queue attribution." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <CardDescription>Lead data source</CardDescription>
                <CardTitle>How this queue is being populated right now</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="rounded-[1.35rem] border border-white/70 bg-white/70 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Active mode</div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">{dataSourceLabel}</div>
              <div className="mt-2 leading-6">Supported imports: `.csv`, `.xls`, `.xlsx`</div>
            </div>
            <p className="leading-6">
              The import flow normalizes district and phone values, removes duplicates, and keeps the latest local import visible when Supabase is not configured.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <code className="rounded-[1rem] bg-[#112031] px-4 py-3 font-mono text-xs text-slate-100">POST /api/leads/import</code>
              <code className="rounded-[1rem] bg-[#112031] px-4 py-3 font-mono text-xs text-slate-100">POST /api/branches/recommend</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] border border-[rgba(179,132,67,0.2)] bg-[rgba(179,132,67,0.08)] p-2 text-[rgb(120,83,34)]">
                <MapPinned className="h-4 w-4" />
              </div>
              <div>
                <CardDescription>Range summary</CardDescription>
                <CardTitle>What your team is actually scanning in this slice</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-white/70 bg-white/70 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Showing</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                {rangeStart.toLocaleString()}-{rangeEnd.toLocaleString()}
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/70 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Total pages</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{totalPages.toLocaleString()}</div>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/70 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Hot or priority</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{hotCount.toLocaleString()}</div>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/70 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Payment pending</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{paymentPendingCount.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-[1rem] border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <CardDescription>Lead filters</CardDescription>
              <CardTitle>Carve the queue by intent, stage, branch, and campaign</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Stage</span>
              <select name="stage" defaultValue={filters.stage ?? ""} className="dashboard-input">
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
              <select name="status" defaultValue={filters.status ?? ""} className="dashboard-input">
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
              <select name="branch" defaultValue={filters.branch ?? ""} className="dashboard-input">
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
              <select name="campaign" defaultValue={filters.campaign ?? ""} className="dashboard-input">
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
            <label className="dashboard-checkbox-row">
              <input type="checkbox" name="hot" value="1" defaultChecked={filters.onlyHot} />
              Hot leads
            </label>
            <label className="dashboard-checkbox-row">
              <input type="checkbox" name="callback" value="1" defaultChecked={filters.callbackRequested} />
              Callback requested
            </label>
            <label className="dashboard-checkbox-row">
              <input type="checkbox" name="visit" value="1" defaultChecked={filters.visitRequested} />
              Visit requested
            </label>
            <label className="dashboard-checkbox-row">
              <input type="checkbox" name="payment" value="1" defaultChecked={filters.paymentPending} />
              Payment pending
            </label>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardDescription>Lead queue</CardDescription>
              <CardTitle>Fast triage table for the admissions floor</CardTitle>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(179,132,67,0.2)] bg-[rgba(179,132,67,0.08)] px-3 py-2 text-sm text-[rgb(120,83,34)]">
              <Flame className="h-4 w-4" />
              Keep hot leads moving first
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200/80 text-slate-500">
              <tr>
                <th className="pb-4 font-medium">Lead</th>
                <th className="pb-4 font-medium">Location</th>
                <th className="pb-4 font-medium">Branch</th>
                <th className="pb-4 font-medium">Stage</th>
                <th className="pb-4 font-medium">Status</th>
                <th className="pb-4 font-medium">Score</th>
                <th className="pb-4 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {leads.map((lead) => (
                <tr key={lead.id} className="align-top">
                  <td className="py-4 pr-4">
                    <Link href={`/dashboard/leads/${lead.id}`} className="font-semibold text-slate-950 transition hover:text-teal-800">
                      {getLeadDisplayName(lead.student_name, lead.parent_name)}
                    </Link>
                    <div className="mt-1 text-slate-500">{lead.parent_phone ?? lead.student_phone}</div>
                    <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">{humanizeToken(lead.utm_campaign ?? "manual")}</div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">
                    <div>{lead.city ?? "Unknown city"}</div>
                    <div className="text-xs text-slate-400">{lead.district ?? "Unknown district"}</div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">
                    {branchLookup.get(lead.assigned_branch_id ?? lead.preferred_branch_id ?? "") ?? "Unassigned"}
                  </td>
                  <td className="py-4 pr-4">
                    <LeadStageBadge stage={lead.stage} />
                  </td>
                  <td className="py-4 pr-4">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td className="py-4 pr-4">
                    <div className="inline-flex rounded-full border border-[rgba(179,132,67,0.22)] bg-[rgba(179,132,67,0.08)] px-3 py-1.5 font-semibold text-[rgb(120,83,34)]">
                      {lead.lead_score}
                    </div>
                  </td>
                  <td className="py-4 text-slate-500">{formatDateTime(lead.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No leads match the selected filters.
            </div>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200/80 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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
