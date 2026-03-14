import { randomUUID } from "crypto";

import type { LeadEvent } from "@/types/domain";
import type { ObjectionLog, ObjectionSeverity, ObjectionType } from "@/types/operations";

const objectionPatterns: Array<{
  type: ObjectionType;
  severity: ObjectionSeverity;
  patterns: RegExp[];
  suggested_response: string;
  normalized_objection: string;
}> = [
  {
    type: "fee_high",
    severity: "high",
    patterns: [/\bfee\b/i, /\bcost\b/i, /\bexpensive\b/i, /\btoo high\b/i],
    suggested_response: "Acknowledge the concern, share the fee snapshot, and offer counselor help for scholarship or installment clarity.",
    normalized_objection: "Fee concern",
  },
  {
    type: "too_far",
    severity: "medium",
    patterns: [/\bfar\b/i, /\bdistance\b/i, /\bcommute\b/i, /\btravel\b/i],
    suggested_response: "Offer a closer branch or transport-supported option.",
    normalized_objection: "Distance concern",
  },
  {
    type: "hostel_concern",
    severity: "medium",
    patterns: [/\bhostel\b/i, /\bfood\b/i, /\bsafety\b/i, /\bgirls hostel\b/i, /\bboys hostel\b/i],
    suggested_response: "Share hostel proof, supervision, and invite the parent for a visit.",
    normalized_objection: "Hostel concern",
  },
  {
    type: "wants_other_course",
    severity: "medium",
    patterns: [/\bother course\b/i, /\bchange course\b/i, /\bwant btech\b/i, /\bdegree\b/i],
    suggested_response: "Requalify the lead before pushing the same branch.",
    normalized_objection: "Different course preference",
  },
  {
    type: "parent_not_convinced",
    severity: "high",
    patterns: [/\bfather\b/i, /\bmother\b/i, /\bparent not convinced\b/i, /\bfamily decision\b/i],
    suggested_response: "Send a family-summary trust pack and schedule a counselor call.",
    normalized_objection: "Family approval pending",
  },
  {
    type: "comparing_competitor",
    severity: "medium",
    patterns: [/\bcompare\b/i, /\bnarayana\b/i, /\bsri chaitanya\b/i, /\bcompetitor\b/i, /\banother college\b/i],
    suggested_response: "Keep the comparison factual: trust, location, fees, hostel, and seat availability.",
    normalized_objection: "Competitor comparison",
  },
  {
    type: "waiting_for_results",
    severity: "medium",
    patterns: [/\bresults\b/i, /\bafter result\b/i, /\bmark memo\b/i],
    suggested_response: "Set a reminder and offer a shortlist now so the parent is ready once results land.",
    normalized_objection: "Waiting for results",
  },
  {
    type: "wants_scholarship",
    severity: "medium",
    patterns: [/\bscholarship\b/i, /\bdiscount\b/i, /\bconcession\b/i],
    suggested_response: "Route to counselor with scholarship context instead of generic bot replies.",
    normalized_objection: "Scholarship expectation",
  },
  {
    type: "not_ready_now",
    severity: "low",
    patterns: [/\blater\b/i, /\bnot now\b/i, /\bafter some time\b/i],
    suggested_response: "Pause active pressure and schedule a reminder.",
    normalized_objection: "Not ready now",
  },
  {
    type: "trust_issue",
    severity: "high",
    patterns: [/\btrust\b/i, /\bscam\b/i, /\bfake\b/i, /\brecognition\b/i, /\bapproved\b/i],
    suggested_response: "Lead with affiliation, address, maps, and official payment steps before asking for commitment.",
    normalized_objection: "Trust issue",
  },
];

export function detectObjectionFromText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const matched = objectionPatterns.find((definition) => definition.patterns.some((pattern) => pattern.test(trimmed)));
  return matched ?? null;
}

export function buildObjectionLog(args: { leadId: string; text: string }): ObjectionLog | null {
  const matched = detectObjectionFromText(args.text);
  if (!matched) {
    return null;
  }

  return {
    id: randomUUID(),
    lead_id: args.leadId,
    objection_type: matched.type,
    objection_text: args.text,
    normalized_objection: matched.normalized_objection,
    severity: matched.severity,
    suggested_response: matched.suggested_response,
    counselor_reviewed: false,
    created_at: new Date().toISOString(),
  };
}

export function buildObjectionEvent(log: ObjectionLog): LeadEvent {
  return {
    id: randomUUID(),
    lead_id: log.lead_id,
    event_type: `objection_${log.objection_type}`,
    event_source: "objection_engine",
    payload: {
      severity: log.severity,
      normalized_objection: log.normalized_objection,
    },
    created_at: log.created_at,
  };
}
