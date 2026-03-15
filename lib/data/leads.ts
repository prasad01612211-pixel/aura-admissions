import "server-only";

import { getLeadWorkflowSnapshot } from "@/lib/admission/service";
import { getRecommendationScopeMode, recommendBranches } from "@/lib/branch-matching/recommend";
import { getActiveBranchProfiles } from "@/lib/data/branches";
import {
  getLeadSourceKey,
  isLeadAtRisk,
  isOpenTask,
  isOverdueTask,
} from "@/lib/data/conversion-engine-core";
import { getLocalFixtureContext } from "@/lib/data/local-state";
import {
  branches,
  campaigns,
  users,
} from "@/lib/fixtures/demo-data";
import { getLocalImportedLeadList } from "@/lib/local-import/store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  AdmissionForm,
  Branch,
  BranchRecommendation,
  Campaign,
  Conversation,
  Lead,
  LeadEvent,
  LeadStage,
  LeadStatus,
  Payment,
  Task,
  User,
} from "@/types/domain";

export interface LeadListFilters {
  stage?: LeadStage;
  status?: LeadStatus;
  branch?: string;
  campaign?: string;
  owner?: string;
  source?: string;
  onlyHot?: boolean;
  atRisk?: boolean;
  unowned?: boolean;
  callbackRequested?: boolean;
  visitRequested?: boolean;
  paymentPending?: boolean;
  overdueCallback?: boolean;
  paymentRecovery?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface LeadListResult {
  leads: Lead[];
  branches: Branch[];
  campaigns: Campaign[];
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hotCount: number;
  paymentPendingCount: number;
  dataSource: "fixtures" | "local_import" | "supabase";
  sourceLabel: string;
}

export interface LeadDetailResult {
  lead: Lead;
  assignedBranch: Branch | null;
  preferredBranch: Branch | null;
  owner: User | null;
  events: LeadEvent[];
  messages: Conversation[];
  admissionForm: AdmissionForm | null;
  payments: Payment[];
  tasks: Task[];
  recommendedBranches: BranchRecommendation[];
  users: User[];
}

type FilterableQuery<TQuery> = {
  eq(column: string, value: unknown): TQuery;
  or(filters: string): TQuery;
  gte(column: string, value: string | number): TQuery;
  lte(column: string, value: string | number): TQuery;
};

function buildTaskRowsByLeadId(taskRows: Task[]) {
  const taskRowsByLeadId = new Map<string, Task[]>();

  taskRows.forEach((task) => {
    const current = taskRowsByLeadId.get(task.lead_id) ?? [];
    current.push(task);
    taskRowsByLeadId.set(task.lead_id, current);
  });

  return taskRowsByLeadId;
}

function hasAdvancedFilters(filters: LeadListFilters) {
  return Boolean(
    filters.owner ||
      filters.source ||
      filters.atRisk ||
      filters.unowned ||
      filters.overdueCallback ||
      filters.paymentRecovery,
  );
}

function applyFilters(sourceLeads: Lead[], filters: LeadListFilters, taskRowsByLeadId = new Map<string, Task[]>()) {
  return sourceLeads.filter((lead) => {
    const scopedTasks = taskRowsByLeadId.get(lead.id) ?? [];

    if (filters.stage && lead.stage !== filters.stage) return false;
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.branch && lead.assigned_branch_id !== filters.branch && lead.preferred_branch_id !== filters.branch) return false;
    if (filters.campaign && lead.utm_campaign !== filters.campaign) return false;
    if (filters.owner && lead.owner_user_id !== filters.owner) return false;
    if (filters.source && getLeadSourceKey(lead) !== filters.source) return false;
    if (filters.onlyHot && lead.lead_score < 50) return false;
    if (filters.atRisk && !isLeadAtRisk(lead)) return false;
    if (filters.unowned && Boolean(lead.owner_user_id)) return false;
    if (filters.callbackRequested && lead.stage !== "callback_requested") return false;
    if (filters.visitRequested && lead.stage !== "visit_requested") return false;
    if (filters.paymentPending && lead.stage !== "payment_pending") return false;
    if (filters.overdueCallback && !scopedTasks.some((task) => task.task_type === "callback" && isOverdueTask(task))) return false;
    if (filters.paymentRecovery && !scopedTasks.some((task) => task.task_type === "payment_followup" && isOpenTask(task))) return false;
    if (filters.dateFrom && lead.created_at < new Date(filters.dateFrom).toISOString()) return false;
    if (filters.dateTo && lead.created_at > new Date(filters.dateTo).toISOString()) return false;
    return true;
  });
}

function sortLeads(sourceLeads: Lead[]) {
  return [...sourceLeads].sort((left, right) => {
    if (right.lead_score !== left.lead_score) return right.lead_score - left.lead_score;
    return right.updated_at.localeCompare(left.updated_at);
  });
}

function normalizePage(value: number | undefined) {
  if (!value || Number.isNaN(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function normalizePageSize(value: number | undefined) {
  if (!value || Number.isNaN(value)) {
    return 100;
  }

  return Math.min(200, Math.max(25, Math.floor(value)));
}

function paginate(sourceLeads: Lead[], page: number, pageSize: number) {
  const total = sourceLeads.length;
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  return {
    rows: sourceLeads.slice(offset, offset + pageSize),
    total,
    page: safePage,
    totalPages,
  };
}

function applySupabaseFilters<TQuery extends FilterableQuery<TQuery>>(query: TQuery, filters: LeadListFilters) {
  let current = query;

  if (filters.stage) current = current.eq("stage", filters.stage);
  if (filters.status) current = current.eq("status", filters.status);
  if (filters.branch) current = current.or(`assigned_branch_id.eq.${filters.branch},preferred_branch_id.eq.${filters.branch}`);
  if (filters.campaign) current = current.eq("utm_campaign", filters.campaign);
  if (filters.onlyHot) current = current.gte("lead_score", 50);
  if (filters.callbackRequested) current = current.eq("stage", "callback_requested");
  if (filters.visitRequested) current = current.eq("stage", "visit_requested");
  if (filters.paymentPending) current = current.eq("stage", "payment_pending");
  if (filters.owner) current = current.eq("owner_user_id", filters.owner);
  if (filters.dateFrom) current = current.gte("created_at", new Date(filters.dateFrom).toISOString());
  if (filters.dateTo) current = current.lte("created_at", new Date(filters.dateTo).toISOString());

  return current;
}

export async function getLeadList(filters: LeadListFilters = {}): Promise<LeadListResult> {
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const localResult = await getLocalImportedLeadList({ ...filters, page, pageSize });

    if (localResult) {
      return {
        leads: localResult.leads,
        branches,
        campaigns: localResult.campaigns,
        users,
        total: localResult.total,
        page: localResult.page,
        pageSize: localResult.pageSize,
        totalPages: localResult.totalPages,
        hotCount: localResult.hotCount,
        paymentPendingCount: localResult.paymentPendingCount,
        dataSource: "local_import",
        sourceLabel: localResult.sourceLabel,
      };
    }

    const fixtureContext = await getLocalFixtureContext();
    const fixtureLeads = fixtureContext.leads;
    const filteredLeads = sortLeads(applyFilters(fixtureLeads, filters, buildTaskRowsByLeadId(fixtureContext.tasks)));
    const paginated = paginate(filteredLeads, page, pageSize);

    return {
      leads: paginated.rows,
      branches: fixtureContext.branches,
      campaigns: fixtureContext.campaigns,
      users: fixtureContext.users,
      total: paginated.total,
      page: paginated.page,
      pageSize,
      totalPages: paginated.totalPages,
      hotCount: filteredLeads.filter((lead) => lead.lead_score >= 50).length,
      paymentPendingCount: filteredLeads.filter((lead) => lead.stage === "payment_pending").length,
      dataSource: "fixtures",
      sourceLabel: fixtureContext.source_label,
    };
  }

  if (hasAdvancedFilters(filters)) {
    const [leadResponse, taskResponse, branchResponse, campaignResponse, userResponse] = await Promise.all([
      applySupabaseFilters(supabase.from("leads").select("*"), filters).order("updated_at", { ascending: false }),
      supabase.from("tasks").select("*"),
      supabase.from("branches").select("*").order("name"),
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("*").order("name"),
    ]);

    const filteredLeads = sortLeads(
      applyFilters(
        (leadResponse.data ?? []) as Lead[],
        filters,
        buildTaskRowsByLeadId((taskResponse.data ?? []) as Task[]),
      ),
    );
    const paginated = paginate(filteredLeads, page, pageSize);

    return {
      leads: paginated.rows,
      branches: (branchResponse.data as Branch[] | null) ?? branches,
      campaigns: (campaignResponse.data as Campaign[] | null) ?? campaigns,
      users: (userResponse.data as User[] | null) ?? users,
      total: paginated.total,
      page: paginated.page,
      pageSize,
      totalPages: paginated.totalPages,
      hotCount: filteredLeads.filter((lead) => lead.lead_score >= 50).length,
      paymentPendingCount: filteredLeads.filter((lead) => lead.stage === "payment_pending").length,
      dataSource: "supabase",
      sourceLabel: "Supabase",
    };
  }

  const offset = (page - 1) * pageSize;

  const [leadResponse, countResponse, hotCountResponse, paymentPendingResponse, branchResponse, campaignResponse, userResponse] =
    await Promise.all([
      applySupabaseFilters(supabase.from("leads").select("*"), filters)
        .order("updated_at", { ascending: false })
        .range(offset, offset + pageSize - 1),
      applySupabaseFilters(supabase.from("leads").select("id", { count: "exact", head: true }), filters),
      applySupabaseFilters(supabase.from("leads").select("id", { count: "exact", head: true }), filters).gte("lead_score", 50),
      applySupabaseFilters(supabase.from("leads").select("id", { count: "exact", head: true }), filters).eq("stage", "payment_pending"),
      supabase.from("branches").select("*").order("name"),
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("*").order("name"),
    ]);

  const leadRows = (leadResponse.data ?? []) as Lead[];
  const total = countResponse.count ?? leadRows.length;

  return {
    leads: sortLeads(leadRows),
    branches: (branchResponse.data as Branch[] | null) ?? branches,
    campaigns: (campaignResponse.data as Campaign[] | null) ?? campaigns,
    users: (userResponse.data as User[] | null) ?? users,
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 1 : Math.ceil(total / pageSize),
    hotCount: hotCountResponse.count ?? 0,
    paymentPendingCount: paymentPendingResponse.count ?? 0,
    dataSource: "supabase",
    sourceLabel: "Supabase",
  };
}

export async function getLeadDetail(leadId: string): Promise<LeadDetailResult | null> {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const workflowSnapshot = await getLeadWorkflowSnapshot(leadId);
    if (!workflowSnapshot) return null;
    const availableBranches = await getActiveBranchProfiles();

    return {
      lead: workflowSnapshot.lead,
      assignedBranch: branches.find((branch) => branch.id === workflowSnapshot.lead.assigned_branch_id) ?? null,
      preferredBranch: branches.find((branch) => branch.id === workflowSnapshot.lead.preferred_branch_id) ?? null,
      owner: users.find((user) => user.id === workflowSnapshot.lead.owner_user_id) ?? null,
      events: workflowSnapshot.events,
      messages: workflowSnapshot.messages,
      admissionForm: workflowSnapshot.form,
      payments: workflowSnapshot.payments,
      tasks: workflowSnapshot.tasks,
      users,
      recommendedBranches: recommendBranches(
        {
          pincode: workflowSnapshot.lead.pincode,
          district: workflowSnapshot.lead.district,
          city: workflowSnapshot.lead.city,
          locality: workflowSnapshot.lead.area ?? workflowSnapshot.lead.preferred_location ?? null,
          course_interest: workflowSnapshot.lead.course_interest,
          hostel_required: workflowSnapshot.lead.hostel_required,
          scope_mode: getRecommendationScopeMode(),
        },
        availableBranches,
      ),
    };
  }

  const [{ data: lead }, { data: eventRows }, { data: messageRows }, { data: formRows }, { data: paymentRows }, { data: taskRows }, { data: userRows }] =
    await Promise.all([
      supabase.from("leads").select("*").eq("id", leadId).maybeSingle(),
      supabase.from("lead_events").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
      supabase.from("conversations").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
      supabase.from("admission_forms").select("*").eq("lead_id", leadId),
      supabase.from("payments").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
      supabase.from("users").select("*"),
    ]);

  const leadRow = (lead as Lead | null) ?? null;

  if (!leadRow) {
    return null;
  }

  const availableBranches = await getActiveBranchProfiles();
  const ownerList = (userRows ?? []) as User[];

  return {
    lead: leadRow,
    assignedBranch: availableBranches.find((branch) => branch.id === leadRow.assigned_branch_id) ?? null,
    preferredBranch: availableBranches.find((branch) => branch.id === leadRow.preferred_branch_id) ?? null,
    owner: ownerList.find((user) => user.id === leadRow.owner_user_id) ?? null,
    events: (eventRows ?? []) as LeadEvent[],
    messages: (messageRows ?? []) as Conversation[],
    admissionForm: ((formRows ?? [])[0] as AdmissionForm | undefined) ?? null,
    payments: (paymentRows ?? []) as Payment[],
    tasks: (taskRows ?? []) as Task[],
    users: ownerList,
    recommendedBranches: recommendBranches(
      {
        pincode: leadRow.pincode,
        district: leadRow.district,
        city: leadRow.city,
        locality: leadRow.area ?? leadRow.preferred_location ?? null,
        course_interest: leadRow.course_interest,
        hostel_required: leadRow.hostel_required,
        scope_mode: getRecommendationScopeMode(),
      },
      availableBranches,
    ),
  };
}
