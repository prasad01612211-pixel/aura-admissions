import { Badge } from "@/components/ui/badge";
import { leadStageLabels, leadStatusLabels } from "@/lib/state-machine/constants";
import type { LeadStage, LeadStatus } from "@/types/domain";

const stageVariants: Record<LeadStage, "neutral" | "info" | "success" | "warning" | "danger" | "accent"> = {
  imported: "neutral",
  contacted: "info",
  replied: "info",
  qualified: "success",
  branch_shown: "accent",
  branch_viewed: "accent",
  callback_requested: "warning",
  visit_requested: "warning",
  form_started: "accent",
  form_submitted: "success",
  payment_pending: "warning",
  seat_locked: "success",
  admission_in_progress: "info",
  admission_confirmed: "success",
  lost: "danger",
};

const statusVariants: Record<LeadStatus, "neutral" | "info" | "success" | "warning" | "danger" | "accent"> = {
  new: "neutral",
  warm: "info",
  hot: "warning",
  followup: "accent",
  won: "success",
  lost: "danger",
  invalid: "danger",
  duplicate: "neutral",
};

export function LeadStageBadge({ stage }: { stage: LeadStage }) {
  return <Badge variant={stageVariants[stage]}>{leadStageLabels[stage]}</Badge>;
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={statusVariants[status]}>{leadStatusLabels[status]}</Badge>;
}
