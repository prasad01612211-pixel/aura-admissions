import type {
  AppDataSource,
  Branch,
  BranchTrustAsset,
  ConversationChannel,
  ConversationDeliveryStatus,
  ConversationDirection,
  ConversationMessageType,
  Institution,
  Lead,
  LeadEvent,
} from "@/types/domain";

export const organizationTypes = [
  "consultancy",
  "college",
  "junior_college",
  "engineering_college",
  "degree_college",
] as const;

export const institutionPublicationStatuses = ["draft", "verified", "live"] as const;
export const branchVerificationStatuses = ["pending", "verified", "rejected"] as const;
export const programCategories = ["intermediate", "btech", "degree"] as const;
export const feeTypes = ["tuition", "hostel", "transport", "admission", "exam", "misc", "seat_lock"] as const;
export const feeFrequencies = ["one_time", "yearly", "semester"] as const;
export const requiredDocumentStages = ["enquiry", "application", "admission_confirmation", "joining"] as const;
export const objectionTypes = [
  "fee_high",
  "too_far",
  "hostel_concern",
  "wants_other_course",
  "parent_not_convinced",
  "comparing_competitor",
  "waiting_for_results",
  "wants_scholarship",
  "not_ready_now",
  "trust_issue",
] as const;
export const objectionSeverities = ["low", "medium", "high"] as const;
export const visitBookingStatuses = ["proposed", "confirmed", "completed", "cancelled"] as const;
export const visitOutcomeStatuses = ["attended", "rescheduled", "no_show", "converted"] as const;
export const joinedStatuses = ["pending", "confirmed", "dropped"] as const;
export const commissionLedgerStatuses = ["not_ready", "ready", "invoiced", "received", "disputed"] as const;
export const conversationThreadStatuses = ["active", "paused", "escalated", "closed"] as const;
export const setupWizardStepKeys = [
  "organization_profile",
  "institution_details",
  "branch_details",
  "programs_and_intake",
  "fees",
  "eligibility_and_documents",
  "trust_assets",
  "admission_cycle",
  "commission_rules",
  "whatsapp_settings",
  "review_and_publish",
] as const;
export const leadIntentLabels = ["cold", "warm", "hot", "payment_ready"] as const;

export type OrganizationType = (typeof organizationTypes)[number];
export type InstitutionPublicationStatus = (typeof institutionPublicationStatuses)[number];
export type BranchVerificationStatus = (typeof branchVerificationStatuses)[number];
export type ProgramCategory = (typeof programCategories)[number];
export type FeeType = (typeof feeTypes)[number];
export type FeeFrequency = (typeof feeFrequencies)[number];
export type RequiredDocumentStage = (typeof requiredDocumentStages)[number];
export type ObjectionType = (typeof objectionTypes)[number];
export type ObjectionSeverity = (typeof objectionSeverities)[number];
export type VisitBookingStatus = (typeof visitBookingStatuses)[number];
export type VisitOutcomeStatus = (typeof visitOutcomeStatuses)[number];
export type JoinedStatus = (typeof joinedStatuses)[number];
export type CommissionLedgerStatus = (typeof commissionLedgerStatuses)[number];
export type ConversationThreadStatus = (typeof conversationThreadStatuses)[number];
export type SetupWizardStepKey = (typeof setupWizardStepKeys)[number];
export type LeadIntentLabel = (typeof leadIntentLabels)[number];

export interface Organization {
  id: string;
  type: OrganizationType;
  legal_name: string;
  public_name: string;
  trust_or_company_name: string | null;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  website: string | null;
  logo_url: string | null;
  state: string | null;
  district: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  branch_id: string;
  category: ProgramCategory;
  course_name: string;
  specialization: string | null;
  code: string;
  duration: string | null;
  medium: string | null;
  active_for_cycle: boolean;
  intake_total: number;
  seats_available: number;
  management_quota_available: boolean;
  lateral_entry_available: boolean;
  eligibility_json: Record<string, unknown>;
  brochure_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeStructure {
  id: string;
  program_id: string;
  academic_year: string;
  fee_type: FeeType;
  amount: number;
  frequency: FeeFrequency;
  installment_available: boolean;
  installment_notes: string | null;
  scholarship_notes: string | null;
  refund_policy: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdmissionCycle {
  id: string;
  institution_id: string;
  name: string;
  academic_year: string;
  admissions_open: boolean;
  application_start_date: string | null;
  application_end_date: string | null;
  counseling_start_date: string | null;
  counseling_end_date: string | null;
  spot_admission_start_date: string | null;
  spot_admission_end_date: string | null;
  classes_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequiredDocument {
  id: string;
  program_id: string;
  document_name: string;
  mandatory: boolean;
  stage_required: RequiredDocumentStage;
  accepted_file_types_json: string[];
  max_file_size_mb: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationThread {
  id: string;
  lead_id: string;
  channel: ConversationChannel;
  started_at: string;
  last_message_at: string | null;
  status: ConversationThreadStatus;
  created_at: string;
  updated_at: string;
}

export interface MessageEvent {
  id: string;
  conversation_id: string | null;
  lead_id: string;
  direction: ConversationDirection;
  message_type: ConversationMessageType;
  template_name: string | null;
  content: string | null;
  metadata_json: Record<string, unknown>;
  delivery_status: ConversationDeliveryStatus;
  provider_message_id: string | null;
  created_at: string;
}

export interface Recommendation {
  id: string;
  lead_id: string;
  branch_id: string;
  program_id: string | null;
  rank_position: number;
  score: number;
  reasons_json: string[];
  was_viewed: boolean;
  was_clicked: boolean;
  created_at: string;
}

export interface ObjectionLog {
  id: string;
  lead_id: string;
  objection_type: ObjectionType;
  objection_text: string;
  normalized_objection: string;
  severity: ObjectionSeverity;
  suggested_response: string | null;
  counselor_reviewed: boolean;
  created_at: string;
}

export interface VisitBooking {
  id: string;
  lead_id: string;
  branch_id: string;
  scheduled_for: string;
  attendee_count: number;
  notes: string | null;
  status: VisitBookingStatus;
  outcome_status: VisitOutcomeStatus | null;
  created_at: string;
  updated_at: string;
}

export interface Conversion {
  id: string;
  lead_id: string;
  branch_id: string;
  program_id: string | null;
  admission_form_id: string | null;
  payment_order_id: string | null;
  joined_status: JoinedStatus;
  joined_at: string | null;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionLedger {
  id: string;
  conversion_id: string;
  commission_rule_id: string | null;
  expected_amount: number;
  payout_status: CommissionLedgerStatus;
  payout_due_date: string | null;
  payout_received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  created_at: string;
}

export interface TemplateRegistryItem {
  id: string;
  name: string;
  channel: "whatsapp";
  category: "marketing" | "utility" | "authentication";
  language_code: string;
  approved: boolean;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationCommunicationSetting {
  id: string;
  organization_id: string;
  sandbox_mode: boolean;
  sandbox_numbers: string[];
  whatsapp_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  timezone: string;
  rate_limit_per_minute: number;
  retry_limit: number;
  seat_lock_enabled: boolean;
  default_seat_lock_amount: number;
  payment_terms_text: string;
  refund_policy_text: string;
  created_at: string;
  updated_at: string;
}

export interface SetupWizardStepState {
  key: SetupWizardStepKey;
  label: string;
  required: boolean;
  completed: boolean;
}

export interface SetupWizardDraft {
  id: string;
  organization_id: string | null;
  institution_id: string | null;
  step_key: SetupWizardStepKey;
  draft_payload: Record<string, unknown>;
  completed_steps: SetupWizardStepKey[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntentScoringRule {
  key: string;
  label: string;
  points: number;
  event_types?: string[];
  field_required?: keyof Lead;
  message_patterns?: string[];
}

export interface LeadIntentScoreEvent {
  key: string;
  label: string;
  points: number;
  applied: boolean;
  reason: string;
}

export interface LeadIntentSummary {
  score: number;
  label: LeadIntentLabel;
  threshold_source: "default" | "settings";
  events: LeadIntentScoreEvent[];
}

export interface SetupWizardSnapshot {
  source_label: string;
  draft: SetupWizardDraft | null;
  steps: SetupWizardStepState[];
  publish_ready: boolean;
  blockers: string[];
  organization: Organization | null;
  institutions: Institution[];
  branches: Branch[];
  programs: Program[];
  fee_structures: FeeStructure[];
  admission_cycles: AdmissionCycle[];
  required_documents: RequiredDocument[];
  communication_settings: OrganizationCommunicationSetting | null;
  trust_assets: BranchTrustAsset[];
}

export interface VisitMetricsSnapshot {
  data_source: AppDataSource;
  source_label: string;
  total: number;
  confirmed: number;
  completed: number;
  no_show: number;
  converted: number;
  rows: VisitBooking[];
}

export interface LeadOperationsSnapshot {
  lead: Lead;
  events: LeadEvent[];
  objections: ObjectionLog[];
  visits: VisitBooking[];
  recommendations: Recommendation[];
  intent: LeadIntentSummary;
  conversion: Conversion | null;
  commission: CommissionLedger | null;
}
