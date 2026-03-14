import type { Lead } from "@/types/domain";
import type { ObjectionSeverity } from "@/types/operations";

const forcedHumanPatterns = [
  "scholarship",
  "discount",
  "refund",
  "complaint",
  "angry",
  "issue",
  "problem",
  "harassment",
  "safety",
  "guarantee",
  "paid already",
  "already paid",
];

export function detectForcedEscalationReason(args: {
  lead: Lead;
  message: string;
  objectionSeverity: ObjectionSeverity | null;
}) {
  if (args.objectionSeverity === "high") {
    return "High-severity objection detected from the inbound message.";
  }

  const normalized = args.message.toLowerCase();
  if (forcedHumanPatterns.some((pattern) => normalized.includes(pattern))) {
    return "Sensitive or commercially risky request detected.";
  }

  if (normalized.includes("paid") && normalized.includes("reminder")) {
    return "Payment status mismatch or dispute detected.";
  }

  if (["payment_pending", "seat_locked", "admission_in_progress"].includes(args.lead.stage) && normalized.includes("help")) {
    return "High-intent lead asked for direct human help.";
  }

  return null;
}
