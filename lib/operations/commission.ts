import type { AdmissionAttribution, Branch, CommissionRule, Lead, Payment } from "@/types/domain";
import type { CommissionLedger, Conversion } from "@/types/operations";

export type PayoutReadinessCheck = {
  key: string;
  label: string;
  ready: boolean;
};

export function getPayoutReadiness(args: {
  lead: Lead;
  branch: Branch | null;
  payment: Payment | null;
  conversion: Conversion | null;
  rule: CommissionRule | null;
}): PayoutReadinessCheck[] {
  return [
    { key: "branch_mapped", label: "Branch mapped", ready: Boolean(args.branch) },
    { key: "rule_exists", label: "Commission rule exists", ready: Boolean(args.rule) },
    { key: "seat_lock_complete", label: "Seat-lock complete", ready: Boolean(args.payment?.status === "paid" || args.lead.seat_lock_paid) },
    { key: "lead_won", label: "Admission outcome marked", ready: args.lead.status === "won" || args.lead.stage === "admission_confirmed" },
    { key: "conversion_row", label: "Conversion row exists", ready: Boolean(args.conversion) },
  ];
}

export function isPayoutReady(checks: PayoutReadinessCheck[]) {
  return checks.every((check) => check.ready);
}

export function mapLegacyPayoutStatus(status: AdmissionAttribution["status"] | Payment["status"] | CommissionLedger["payout_status"]) {
  switch (status) {
    case "commission_eligible":
    case "ready":
      return "ready";
    case "received":
    case "paid":
      return "received";
    case "disputed":
      return "disputed";
    case "invoiced":
      return "invoiced";
    default:
      return "not_ready";
  }
}
