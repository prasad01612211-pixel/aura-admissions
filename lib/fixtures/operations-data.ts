import { getWhatsAppTemplateBody, whatsappTemplateNames } from "@/lib/whatsapp/templates";
import {
  admissionAttributions,
  branches,
  commissionRules,
  institutions,
  leads,
  payments,
  users,
} from "@/lib/fixtures/demo-data";
import { NARAYANA_HYDERABAD_PILOT_SCOPE } from "@/lib/fixtures/narayana-hyderabad";
import type {
  AdmissionCycle,
  CommissionLedger,
  ConversationThread,
  Conversion,
  FeeStructure,
  ObjectionLog,
  Organization,
  OrganizationCommunicationSetting,
  Program,
  Recommendation,
  RequiredDocument,
  SetupWizardDraft,
  TemplateRegistryItem,
  VisitBooking,
} from "@/types/operations";

const opsBaseDate = new Date("2026-03-11T09:00:00.000Z");

const timestamp = (daysAgo: number, hourOffset = 0) =>
  new Date(opsBaseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000).toISOString();

const makeUuid = (namespace: number, index: number) =>
  `${namespace.toString(16).padStart(8, "0")}-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;

export const organizationIds = {
  consultancy: makeUuid(0x12000000, 1),
  narayana: makeUuid(0x12000000, 2),
  srichaitanya: makeUuid(0x12000000, 3),
  dhanikbharat: makeUuid(0x12000000, 4),
} as const;

const programIds = Object.fromEntries(
  branches.flatMap((branch, branchIndex) =>
    branch.courses.map((course, courseIndex) => [
      `${branch.code}-${course.code}`,
      makeUuid(0x13000000 + branchIndex, courseIndex + 1),
    ]),
  ),
) as Record<string, string>;

const branchMap = new Map(branches.map((branch) => [branch.id, branch]));

const feeStructureId = (index: number) => makeUuid(0x14000000, index + 1);
const admissionCycleId = (index: number) => makeUuid(0x15000000, index + 1);
const requiredDocumentId = (index: number) => makeUuid(0x16000000, index + 1);
const recommendationId = (index: number) => makeUuid(0x17000000, index + 1);
const objectionId = (index: number) => makeUuid(0x18000000, index + 1);
const visitBookingId = (index: number) => makeUuid(0x19000000, index + 1);
const conversionId = (index: number) => makeUuid(0x1a000000, index + 1);
const commissionLedgerId = (index: number) => makeUuid(0x1b000000, index + 1);
const conversationThreadId = (index: number) => makeUuid(0x1c000000, index + 1);
const communicationSettingId = (index: number) => makeUuid(0x1d000000, index + 1);
const setupDraftId = (index: number) => makeUuid(0x1e000000, index + 1);
const templateRegistryId = (index: number) => makeUuid(0x1f000000, index + 1);

export const organizations: Organization[] = [
  {
    id: organizationIds.consultancy,
    type: "consultancy",
    legal_name: "Hyderabad Admissions Desk LLP",
    public_name: "Hyderabad Admissions Desk",
    trust_or_company_name: "Hyderabad Admissions Desk",
    primary_contact_name: users[0]?.name ?? "Admissions Desk",
    primary_contact_phone: users[0]?.phone ?? null,
    primary_contact_email: users[0]?.email ?? null,
    website: null,
    logo_url: null,
    state: "Telangana",
    district: "Hyderabad",
    is_active: true,
    created_at: timestamp(45),
    updated_at: timestamp(1),
  },
  {
    id: organizationIds.narayana,
    type: "junior_college",
    legal_name: "Narayana Educational Society",
    public_name: "Narayana Junior Colleges",
    trust_or_company_name: "Narayana Group",
    primary_contact_name: "Narayana Admissions",
    primary_contact_phone: institutions[0]?.contact_phone ?? null,
    primary_contact_email: institutions[0]?.contact_email ?? null,
    website: institutions[0]?.website_url ?? null,
    logo_url: null,
    state: "Telangana",
    district: "Hyderabad",
    is_active: true,
    created_at: timestamp(80),
    updated_at: timestamp(2),
  },
  {
    id: organizationIds.srichaitanya,
    type: "junior_college",
    legal_name: "Sri Chaitanya Educational Institutions",
    public_name: "Sri Chaitanya Junior College",
    trust_or_company_name: "Sri Chaitanya Group",
    primary_contact_name: "Sri Chaitanya Admissions",
    primary_contact_phone: institutions[1]?.contact_phone ?? null,
    primary_contact_email: institutions[1]?.contact_email ?? null,
    website: institutions[1]?.website_url ?? null,
    logo_url: null,
    state: "Telangana",
    district: "Hyderabad",
    is_active: true,
    created_at: timestamp(78),
    updated_at: timestamp(2),
  },
  {
    id: organizationIds.dhanikbharat,
    type: "junior_college",
    legal_name: "Dhanik Bharat Educational Institutions",
    public_name: "Dhanik Bharat",
    trust_or_company_name: "Lloyd Edu Solutions",
    primary_contact_name: "Dhanik Bharat Admissions",
    primary_contact_phone: institutions[2]?.contact_phone ?? null,
    primary_contact_email: institutions[2]?.contact_email ?? null,
    website: institutions[2]?.website_url ?? null,
    logo_url: null,
    state: "Telangana",
    district: "Hyderabad",
    is_active: true,
    created_at: timestamp(76),
    updated_at: timestamp(1),
  },
];

export const programs: Program[] = branches.flatMap((branch) =>
  branch.courses.map((course, index) => ({
    id: programIds[`${branch.code}-${course.code}`],
    branch_id: branch.id,
    category: "intermediate",
    course_name: course.code,
    specialization: course.stream === "Science" ? "Board + Entrance track" : "Commerce track",
    code: course.code,
    duration: course.duration,
    medium: "English",
    active_for_cycle: true,
    intake_total:
      branch.pilot_scope === NARAYANA_HYDERABAD_PILOT_SCOPE ? 0 : Math.max(course.seats_available + 20, course.seats_available),
    seats_available: course.seats_available,
    management_quota_available:
      branch.pilot_scope === NARAYANA_HYDERABAD_PILOT_SCOPE ? false : branch.capacity_available > 0,
    lateral_entry_available: false,
    eligibility_json: {
      minimum_board: "SSC/CBSE/ICSE/Equivalent",
      stream_fit: course.code,
      verification_status: branch.verification_status ?? null,
    },
    brochure_url: null,
    created_at: timestamp(30, index),
    updated_at: timestamp(1),
  })),
);

export const feeStructures: FeeStructure[] = programs.flatMap((program, index) => {
  const branch = branchMap.get(program.branch_id) ?? null;
  const isPilotBranch = branch?.pilot_scope === NARAYANA_HYDERABAD_PILOT_SCOPE;

  if (isPilotBranch) {
    return [
      {
        id: feeStructureId(index * 3),
        program_id: program.id,
        academic_year: "2026-27",
        fee_type: "seat_lock",
        amount: 1000,
        frequency: "one_time",
        installment_available: false,
        installment_notes: null,
        scholarship_notes: null,
        refund_policy: "Seat-lock confirmation is enabled for the pilot. Full fee details are pending branch verification.",
        is_current: true,
        created_at: timestamp(20),
        updated_at: timestamp(1),
      },
    ];
  }

  return [
    {
      id: feeStructureId(index * 3),
      program_id: program.id,
      academic_year: "2026-27",
      fee_type: "tuition",
      amount: program.course_name === "BiPC" ? 95000 : 90000,
      frequency: "yearly",
      installment_available: true,
      installment_notes: "Installments allowed after branch approval.",
      scholarship_notes: "Scholarship depends on marks and branch policy.",
      refund_policy: "Refunds follow institution policy after admission approval.",
      is_current: true,
      created_at: timestamp(20),
      updated_at: timestamp(1),
    },
    {
      id: feeStructureId(index * 3 + 1),
      program_id: program.id,
      academic_year: "2026-27",
      fee_type: "seat_lock",
      amount: 1000,
      frequency: "one_time",
      installment_available: false,
      installment_notes: null,
      scholarship_notes: null,
      refund_policy: "Seat-lock terms are shared before payment.",
      is_current: true,
      created_at: timestamp(20),
      updated_at: timestamp(1),
    },
    {
      id: feeStructureId(index * 3 + 2),
      program_id: program.id,
      academic_year: "2026-27",
      fee_type: branchHasHostel(program.branch_id) ? "hostel" : "transport",
      amount: branchHasHostel(program.branch_id) ? 60000 : 18000,
      frequency: "yearly",
      installment_available: true,
      installment_notes: "Quarterly payments can be discussed with the branch team.",
      scholarship_notes: null,
      refund_policy: "Ancillary fee refunds depend on facility usage.",
      is_current: true,
      created_at: timestamp(19),
      updated_at: timestamp(1),
    },
  ];
});

export const admissionCycles: AdmissionCycle[] = institutions.map((institution, index) => ({
  id: admissionCycleId(index),
  institution_id: institution.id,
  name: `${institution.short_name ?? institution.name} 2026-27`,
  academic_year: "2026-27",
  admissions_open: true,
  application_start_date: "2026-03-15",
  application_end_date: "2026-07-31",
  counseling_start_date: "2026-03-20",
  counseling_end_date: "2026-08-05",
  spot_admission_start_date: "2026-08-10",
  spot_admission_end_date: "2026-08-25",
  classes_start_date: "2026-06-10",
  created_at: timestamp(15),
  updated_at: timestamp(1),
}));

export const requiredDocuments: RequiredDocument[] = programs.flatMap((program, index) => [
  {
    id: requiredDocumentId(index * 3),
    program_id: program.id,
    document_name: "10th memo",
    mandatory: true,
    stage_required: "application",
    accepted_file_types_json: ["pdf", "jpg", "jpeg", "png"],
    max_file_size_mb: 5,
    notes: "Provisional memo accepted during counseling.",
    created_at: timestamp(14),
    updated_at: timestamp(1),
  },
  {
    id: requiredDocumentId(index * 3 + 1),
    program_id: program.id,
    document_name: "Aadhaar copy",
    mandatory: true,
    stage_required: "admission_confirmation",
    accepted_file_types_json: ["pdf", "jpg", "jpeg", "png"],
    max_file_size_mb: 5,
    notes: null,
    created_at: timestamp(14),
    updated_at: timestamp(1),
  },
  {
    id: requiredDocumentId(index * 3 + 2),
    program_id: program.id,
    document_name: "Transfer certificate",
    mandatory: true,
    stage_required: "joining",
    accepted_file_types_json: ["pdf", "jpg", "jpeg", "png"],
    max_file_size_mb: 5,
    notes: "Original required at joining.",
    created_at: timestamp(14),
    updated_at: timestamp(1),
  },
]);

export const recommendations: Recommendation[] = leads.slice(0, 12).flatMap((lead, index) => {
  const branch = branches[index % branches.length];
  const program = programs.find((item) => item.branch_id === branch.id && item.code === (lead.course_interest ?? "MPC"));
  return [
    {
      id: recommendationId(index * 2),
      lead_id: lead.id,
      branch_id: branch.id,
      program_id: program?.id ?? null,
      rank_position: 1,
      score: 84 - index,
      reasons_json: ["District match", "Course available", "Seat availability"],
      was_viewed: index < 8,
      was_clicked: index < 6,
      created_at: timestamp(6, index),
    },
  ];
});

export const objectionLogs: ObjectionLog[] = [
  {
    id: objectionId(0),
    lead_id: leads[1]?.id ?? "",
    objection_type: "fee_high" as const,
    objection_text: "Fee is high, need scholarship details.",
    normalized_objection: "High fee concern with scholarship ask.",
    severity: "high" as const,
    suggested_response: "Position scholarship and installment options, then move to counselor call.",
    counselor_reviewed: false,
    created_at: timestamp(2, 1),
  },
  {
    id: objectionId(1),
    lead_id: leads[2]?.id ?? "",
    objection_type: "hostel_concern" as const,
    objection_text: "Need safe girls hostel and food details.",
    normalized_objection: "Hostel safety concern.",
    severity: "medium" as const,
    suggested_response: "Share hostel proof, supervision, and invite for a campus visit.",
    counselor_reviewed: true,
    created_at: timestamp(2, 2),
  },
  {
    id: objectionId(2),
    lead_id: leads[3]?.id ?? "",
    objection_type: "comparing_competitor" as const,
    objection_text: "Comparing with another corporate college.",
    normalized_objection: "Competitor comparison.",
    severity: "medium" as const,
    suggested_response: "Use trust pack and branch-specific differentiators.",
    counselor_reviewed: false,
    created_at: timestamp(1, 2),
  },
].filter((item) => item.lead_id);

export const visitBookings: VisitBooking[] = [
  {
    id: visitBookingId(0),
    lead_id: leads[4]?.id ?? "",
    branch_id: branches[0]?.id ?? "",
    scheduled_for: new Date("2026-03-13T05:30:00.000Z").toISOString(),
    attendee_count: 2,
    notes: "Parent and student visiting after lunch.",
    status: "confirmed" as const,
    outcome_status: null,
    created_at: timestamp(1),
    updated_at: timestamp(0),
  },
  {
    id: visitBookingId(1),
    lead_id: leads[5]?.id ?? "",
    branch_id: branches[2]?.id ?? branches[1]?.id ?? "",
    scheduled_for: new Date("2026-03-14T06:30:00.000Z").toISOString(),
    attendee_count: 3,
    notes: "Needs hostel walkthrough.",
    status: "proposed" as const,
    outcome_status: null,
    created_at: timestamp(0, 1),
    updated_at: timestamp(0, 1),
  },
].filter((item) => item.lead_id && item.branch_id);

export const conversions: Conversion[] = admissionAttributions.slice(0, 4).map((attribution, index) => ({
  id: conversionId(index),
  lead_id: attribution.lead_id,
  branch_id: attribution.branch_id ?? branches[0]?.id ?? "",
  program_id:
    programs.find((program) => program.branch_id === attribution.branch_id && program.code === leads.find((lead) => lead.id === attribution.lead_id)?.course_interest)?.id ??
    null,
  admission_form_id: null,
  payment_order_id: payments.find((payment) => payment.lead_id === attribution.lead_id)?.id ?? null,
  joined_status: index === 0 ? "confirmed" : "pending",
  joined_at: index === 0 ? timestamp(0) : null,
  verified_by: users[0]?.id ?? null,
  notes: index === 0 ? "Joined and confirmed by branch." : "Waiting for branch confirmation.",
  created_at: timestamp(2),
  updated_at: timestamp(0),
}));

export const commissionLedgers: CommissionLedger[] = conversions.map((conversion, index) => {
  const attribution = admissionAttributions.find((row) => row.lead_id === conversion.lead_id);
  const rule =
    commissionRules.find((row) => row.branch_id === conversion.branch_id) ??
    commissionRules.find((row) => row.institution_id === attribution?.institution_id);

  return {
    id: commissionLedgerId(index),
    conversion_id: conversion.id,
    commission_rule_id: rule?.id ?? null,
    expected_amount: rule?.payout_amount ?? 0,
    payout_status: conversion.joined_status === "confirmed" ? "ready" : "not_ready",
    payout_due_date: conversion.joined_status === "confirmed" ? new Date("2026-03-30T10:00:00.000Z").toISOString() : null,
    payout_received_at: null,
    notes: conversion.joined_status === "confirmed" ? "Awaiting invoice to partner." : "Waiting for conversion verification.",
    created_at: timestamp(1),
    updated_at: timestamp(0),
  };
});

export const conversationThreads: ConversationThread[] = leads.slice(0, 6).map((lead, index) => ({
  id: conversationThreadId(index),
  lead_id: lead.id,
  channel: "whatsapp",
  started_at: timestamp(5, index),
  last_message_at: timestamp(0, index),
  status: index < 4 ? "active" : "escalated",
  created_at: timestamp(5, index),
  updated_at: timestamp(0, index),
}));

export const communicationSettings: OrganizationCommunicationSetting[] = [
  {
    id: communicationSettingId(0),
    organization_id: organizationIds.consultancy,
    sandbox_mode: true,
    sandbox_numbers: ["+919900000111", "+919900000112"],
    whatsapp_enabled: true,
    business_hours_start: "09:00",
    business_hours_end: "20:00",
    timezone: "Asia/Kolkata",
    rate_limit_per_minute: 30,
    retry_limit: 3,
    seat_lock_enabled: true,
    default_seat_lock_amount: 1000,
    payment_terms_text: "Seat-lock amount is adjusted in the final fee where the institution allows it.",
    refund_policy_text: "Refunds depend on the partner institution policy shared before payment.",
    created_at: timestamp(10),
    updated_at: timestamp(0),
  },
];

export const setupWizardDrafts: SetupWizardDraft[] = [
  {
    id: setupDraftId(0),
    organization_id: organizationIds.consultancy,
    institution_id: institutions[0]?.id ?? null,
    step_key: "commission_rules",
    draft_payload: {
      completed_steps: [
        "organization_profile",
        "institution_details",
        "branch_details",
        "programs_and_intake",
        "fees",
        "eligibility_and_documents",
        "trust_assets",
        "admission_cycle",
      ],
    },
    completed_steps: [
      "organization_profile",
      "institution_details",
      "branch_details",
      "programs_and_intake",
      "fees",
      "eligibility_and_documents",
      "trust_assets",
      "admission_cycle",
    ],
    published: false,
    created_at: timestamp(4),
    updated_at: timestamp(0),
  },
];

export const templateRegistry: TemplateRegistryItem[] = whatsappTemplateNames.map((name, index) => ({
  id: templateRegistryId(index),
  name,
  channel: "whatsapp",
  category: name.includes("intro") || name.includes("reminder") ? "marketing" : "utility",
  language_code: "en",
  approved: name !== "payment_success_v1",
  content: getWhatsAppTemplateBody(name),
  created_at: timestamp(12),
  updated_at: timestamp(1),
}));

function branchHasHostel(branchId: string) {
  return branches.find((branch) => branch.id === branchId)?.hostel_available ?? false;
}
