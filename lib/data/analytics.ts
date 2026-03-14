import "server-only";

import { getLocalActiveContext } from "@/lib/data/local-state";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  Branch,
  BranchAnalyticsRow,
  BranchAnalyticsSnapshot,
  Campaign,
  CampaignAnalyticsRow,
  CampaignAnalyticsSnapshot,
  Lead,
  Payment,
} from "@/types/domain";

const qualifiedStages = new Set(["qualified", "branch_shown", "branch_viewed", "callback_requested", "visit_requested", "form_started", "form_submitted", "payment_pending", "seat_locked", "admission_in_progress", "admission_confirmed"]);
const repliedStages = new Set(["replied", "qualified", "branch_shown", "branch_viewed", "callback_requested", "visit_requested", "form_started", "form_submitted", "payment_pending", "seat_locked", "admission_in_progress", "admission_confirmed"]);
const wonStages = new Set(["seat_locked", "admission_in_progress", "admission_confirmed"]);

function toRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(1));
}

function buildCampaignRow(args: {
  campaign: Campaign;
  leadRows: Lead[];
  paymentRows: Payment[];
}): CampaignAnalyticsRow {
  const { campaign, leadRows, paymentRows } = args;
  const scopedLeads = leadRows.filter((lead) => lead.utm_campaign === campaign.source_batch || lead.utm_campaign === campaign.name);
  const scopedPayments = paymentRows.filter((payment) => scopedLeads.some((lead) => lead.id === payment.lead_id));
  const replyCount = scopedLeads.filter((lead) => repliedStages.has(lead.stage)).length;
  const qualifiedCount = scopedLeads.filter((lead) => qualifiedStages.has(lead.stage)).length;
  const paymentCount = scopedPayments.filter((payment) => payment.status === "paid").length;
  const admissionCount = scopedLeads.filter((lead) => lead.status === "won" || wonStages.has(lead.stage)).length;
  const pendingPayments = scopedLeads.filter((lead) => lead.stage === "payment_pending").length;
  const hotLeads = scopedLeads.filter((lead) => lead.lead_score >= 50).length;
  const targetCount = campaign.target_count || scopedLeads.length;

  return {
    ...campaign,
    admission_count: admissionCount,
    hot_leads: hotLeads,
    payment_count: paymentCount,
    pending_payments: pendingPayments,
    qualified_count: qualifiedCount,
    qualification_rate: toRate(qualifiedCount, targetCount),
    reply_count: replyCount,
    reply_rate: toRate(replyCount, targetCount),
    payment_rate: toRate(paymentCount, targetCount),
    admission_rate: toRate(admissionCount, targetCount),
    sent_count: campaign.sent_count,
    target_count: targetCount,
  };
}

function buildBranchRows(args: {
  branchRows: Branch[];
  leadRows: Lead[];
}): BranchAnalyticsRow[] {
  const { branchRows, leadRows } = args;

  return branchRows
    .map((branch) => {
      const linkedLeads = leadRows.filter((lead) => lead.assigned_branch_id === branch.id || lead.preferred_branch_id === branch.id);
      const qualifiedLeads = linkedLeads.filter((lead) => qualifiedStages.has(lead.stage)).length;
      const seatLocked = linkedLeads.filter((lead) => lead.seat_lock_paid || lead.stage === "seat_locked").length;
      const wonCount = linkedLeads.filter((lead) => lead.status === "won" || wonStages.has(lead.stage)).length;

      return {
        admissions_won: wonCount,
        branch_id: branch.id,
        callback_requested: linkedLeads.filter((lead) => lead.stage === "callback_requested").length,
        capacity_available: branch.capacity_available,
        city: branch.city,
        conversion_rate: toRate(wonCount, linkedLeads.length),
        district: branch.district,
        hot_leads: linkedLeads.filter((lead) => lead.lead_score >= 50).length,
        name: branch.name,
        payment_pending: linkedLeads.filter((lead) => lead.stage === "payment_pending").length,
        qualified_leads: qualifiedLeads,
        seat_locked: seatLocked,
        total_leads: linkedLeads.length,
        visit_requested: linkedLeads.filter((lead) => lead.stage === "visit_requested").length,
      } satisfies BranchAnalyticsRow;
    })
    .sort((left, right) => right.total_leads - left.total_leads || right.hot_leads - left.hot_leads);
}

export async function getCampaignAnalyticsSnapshot(): Promise<CampaignAnalyticsSnapshot> {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const localContext = await getLocalActiveContext();

    return {
      data_source: localContext.data_source,
      source_label: localContext.source_label,
      rows: localContext.campaigns.map((campaign) =>
        buildCampaignRow({
          campaign,
          leadRows: localContext.leads,
          paymentRows: localContext.payments,
        }),
      ),
    };
  }

  const [{ data: campaignRows }, { data: leadRows }, { data: paymentRows }] = await Promise.all([
    supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("leads").select("*"),
    supabase.from("payments").select("*"),
  ]);

  return {
    data_source: "supabase",
    source_label: "Supabase",
    rows: ((campaignRows ?? []) as Campaign[]).map((campaign) =>
      buildCampaignRow({
        campaign,
        leadRows: (leadRows ?? []) as Lead[],
        paymentRows: (paymentRows ?? []) as Payment[],
      }),
    ),
  };
}

export async function getBranchAnalyticsSnapshot(): Promise<BranchAnalyticsSnapshot> {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const localContext = await getLocalActiveContext();

    return {
      data_source: localContext.data_source,
      source_label: localContext.source_label,
      rows: buildBranchRows({
        branchRows: localContext.branches,
        leadRows: localContext.leads,
      }),
    };
  }

  const [{ data: branchRows }, { data: leadRows }] = await Promise.all([
    supabase.from("branches").select("*").eq("active", true),
    supabase.from("leads").select("*"),
  ]);

  return {
    data_source: "supabase",
    source_label: "Supabase",
    rows: buildBranchRows({
      branchRows: (branchRows ?? []) as Branch[],
      leadRows: (leadRows ?? []) as Lead[],
    }),
  };
}
