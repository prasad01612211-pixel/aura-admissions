import "server-only";

import { getAiMaxContextTurns } from "@/lib/env";
import { getRecommendationScopeMode, recommendBranches } from "@/lib/branch-matching/recommend";
import { getLeadWorkflowSnapshot } from "@/lib/admission/service";
import { getActiveBranchProfiles } from "@/lib/data/branches";
import { getCommunicationSettings } from "@/lib/operations/settings";
import type { WhatsAppAiContext } from "@/lib/ai/types";
import type { ObjectionSeverity } from "@/types/operations";

export async function buildWhatsAppAiContext(args: {
  leadId: string;
  phone: string;
  inboundMessage: string;
  objectionSeverity?: ObjectionSeverity | null;
}): Promise<WhatsAppAiContext | null> {
  const [snapshot, branchProfiles] = await Promise.all([
    getLeadWorkflowSnapshot(args.leadId),
    getActiveBranchProfiles(),
  ]);

  if (!snapshot) {
    return null;
  }

  const recommendations = recommendBranches(
    {
      pincode: snapshot.lead.pincode,
      district: snapshot.lead.district,
      city: snapshot.lead.city,
      locality: snapshot.lead.area ?? snapshot.lead.preferred_location ?? null,
      course_interest: snapshot.lead.course_interest,
      hostel_required: snapshot.lead.hostel_required,
      scope_mode: getRecommendationScopeMode(),
    },
    branchProfiles,
  );

  const selectedBranch =
    branchProfiles.find((branch) => branch.id === snapshot.lead.assigned_branch_id || branch.id === snapshot.lead.preferred_branch_id) ??
    branchProfiles.find((branch) => branch.id === recommendations[0]?.branch_id) ??
    null;

  const communicationSettings = await getCommunicationSettings(snapshot.lead.organization_id ?? undefined);

  return {
    lead: snapshot.lead,
    source: snapshot.source,
    phone: args.phone,
    inboundMessage: args.inboundMessage,
    form: snapshot.form,
    recentMessages: [...snapshot.messages].sort((left, right) => left.created_at.localeCompare(right.created_at)).slice(-getAiMaxContextTurns()),
    selectedBranch,
    recommendations,
    payments: snapshot.payments,
    openTasks: snapshot.tasks.filter((task) => task.status === "open" || task.status === "in_progress"),
    communicationSettings,
    objectionSeverity: args.objectionSeverity ?? null,
  };
}
