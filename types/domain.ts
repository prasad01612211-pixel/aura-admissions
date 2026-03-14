export const leadStages = [
  "imported",
  "contacted",
  "replied",
  "qualified",
  "branch_shown",
  "branch_viewed",
  "callback_requested",
  "visit_requested",
  "form_started",
  "form_submitted",
  "payment_pending",
  "seat_locked",
  "admission_in_progress",
  "admission_confirmed",
  "lost",
] as const;

export const leadStatuses = [
  "new",
  "warm",
  "hot",
  "followup",
  "won",
  "lost",
  "invalid",
  "duplicate",
] as const;

export const botStates = [
  "awaiting_student_name",
  "awaiting_district",
  "awaiting_course",
  "awaiting_hostel",
  "branch_recommendation_sent",
  "awaiting_branch_action",
  "awaiting_visit_slot",
  "awaiting_form_completion",
  "awaiting_payment",
] as const;

export const conversationChannels = ["whatsapp", "call", "sms", "email"] as const;
export const conversationDirections = ["inbound", "outbound"] as const;
export const conversationMessageTypes = ["text", "template", "interactive", "media"] as const;
export const conversationDeliveryStatuses = [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
  "received",
] as const;
export const admissionSubmissionStatuses = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
] as const;
export const paymentGateways = ["razorpay", "manual"] as const;
export const paymentStatuses = ["created", "pending", "paid", "failed", "refunded", "cancelled"] as const;
export const taskTypes = [
  "callback",
  "visit",
  "payment_followup",
  "document_followup",
  "closure",
] as const;
export const taskPriorities = ["low", "medium", "high", "urgent"] as const;
export const taskStatuses = ["open", "in_progress", "completed", "cancelled"] as const;
export const campaignStatuses = ["draft", "scheduled", "running", "paused", "completed", "archived"] as const;
export const userRoles = ["admin", "counselor", "operations", "finance"] as const;
export const leadScoreBands = ["cold", "warm", "hot", "priority"] as const;
export const institutionStatuses = ["prospect", "active", "paused", "archived"] as const;
export const branchTrustAssetTypes = [
  "campus_photo",
  "hostel_photo",
  "transport_photo",
  "results_proof",
  "brochure",
  "video",
  "testimonial_media",
] as const;
export const branchReviewSources = ["google", "justdial", "website", "manual", "other"] as const;
export const commissionTriggers = ["seat_locked", "admission_confirmed", "full_fee_paid", "manual"] as const;
export const attributionStatuses = [
  "referred",
  "branch_selected",
  "form_submitted",
  "admission_confirmed",
  "commission_eligible",
  "cancelled",
] as const;
export const payoutStatuses = ["pending", "approved", "paid", "disputed", "cancelled"] as const;
export const leadOptInStatuses = ["unknown", "opted_in", "opted_out"] as const;
export const branchTrustBands = ["excellent", "strong", "usable", "weak", "blocked"] as const;
export const partnerBranchVerificationStatuses = ["imported", "reviewing", "verified", "rejected", "promoted"] as const;
export const partnerBranchImportStatuses = ["pending", "completed", "failed"] as const;
export const recommendationScopeModes = ["STANDARD", "NARAYANA_HYDERABAD_ONLY"] as const;
export const branchGeoClusters = [
  "WEST_HYDERABAD",
  "EAST_HYDERABAD",
  "CENTRAL_HYDERABAD",
  "NORTH_HYDERABAD",
] as const;

export type LeadStage = (typeof leadStages)[number];
export type LeadStatus = (typeof leadStatuses)[number];
export type BotState = (typeof botStates)[number];
export type ConversationChannel = (typeof conversationChannels)[number];
export type ConversationDirection = (typeof conversationDirections)[number];
export type ConversationMessageType = (typeof conversationMessageTypes)[number];
export type ConversationDeliveryStatus = (typeof conversationDeliveryStatuses)[number];
export type AdmissionSubmissionStatus = (typeof admissionSubmissionStatuses)[number];
export type PaymentGateway = (typeof paymentGateways)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type TaskType = (typeof taskTypes)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type CampaignStatus = (typeof campaignStatuses)[number];
export type UserRole = (typeof userRoles)[number];
export type LeadScoreBand = (typeof leadScoreBands)[number];
export type InstitutionStatus = (typeof institutionStatuses)[number];
export type BranchTrustAssetType = (typeof branchTrustAssetTypes)[number];
export type BranchReviewSource = (typeof branchReviewSources)[number];
export type CommissionTrigger = (typeof commissionTriggers)[number];
export type AttributionStatus = (typeof attributionStatuses)[number];
export type PayoutStatus = (typeof payoutStatuses)[number];
export type LeadOptInStatus = (typeof leadOptInStatuses)[number];
export type BranchTrustBand = (typeof branchTrustBands)[number];
export type PartnerBranchVerificationStatus = (typeof partnerBranchVerificationStatuses)[number];
export type PartnerBranchImportStatus = (typeof partnerBranchImportStatuses)[number];
export type RecommendationScopeMode = (typeof recommendationScopeModes)[number];
export type BranchGeoCluster = (typeof branchGeoClusters)[number];
export type AppDataSource = "fixtures" | "local_import" | "supabase";

export interface Institution {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  organization_id?: string | null;
  institution_type?: string | null;
  board_or_university?: string | null;
  approvals_json?: Record<string, unknown>;
  naac_grade?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  google_maps_url?: string | null;
  admissions_phone?: string | null;
  admissions_email?: string | null;
  hostel_available?: boolean;
  boys_hostel?: boolean;
  girls_hostel?: boolean;
  transport_available?: boolean;
  trust_assets_json?: Record<string, unknown>;
  publication_status?: "draft" | "verified" | "live";
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  hq_address: string | null;
  status: InstitutionStatus;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchCourse {
  code: string;
  name: string;
  stream: string;
  seats_available: number;
  duration: string;
}

export interface AdmissionDocument {
  label: string;
  status: "pending" | "received";
  url?: string;
}

export interface Branch {
  id: string;
  institution_id: string | null;
  name: string;
  code: string;
  branch_name?: string | null;
  locality?: string | null;
  district: string;
  city: string;
  state?: string | null;
  pincode: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
  google_maps_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  hostel_available: boolean;
  boys_hostel?: boolean;
  girls_hostel?: boolean;
  transport_available: boolean;
  pilot_scope?: string | null;
  geo_cluster?: BranchGeoCluster | null;
  groups_available?: string[] | null;
  photos_json?: Record<string, unknown>;
  reviews_json?: Record<string, unknown>;
  trust_assets_json?: Record<string, unknown>;
  trust_score?: number | null;
  verification_status?: "pending" | "verified" | "rejected";
  verification_notes?: string | null;
  courses: BranchCourse[];
  capacity_total: number;
  capacity_available: number;
  priority_rank: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchAsset {
  id: string;
  branch_id: string;
  asset_type: "image" | "video" | "brochure";
  title: string;
  file_url: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface BranchContact {
  id: string;
  branch_id: string;
  institution_id: string | null;
  contact_name: string;
  role: string;
  phone: string | null;
  email: string | null;
  whatsapp_phone: string | null;
  primary_contact: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchTrustAsset {
  id: string;
  branch_id: string;
  asset_type: BranchTrustAssetType;
  title: string;
  file_url: string;
  source_url: string | null;
  source_type: string | null;
  publishable: boolean;
  verified: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BranchReview {
  id: string;
  branch_id: string;
  source: BranchReviewSource;
  source_url: string | null;
  rating: number | null;
  review_count: number;
  review_summary_positive: string | null;
  review_summary_negative: string | null;
  confidence_score: number | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BranchFeeSnapshot {
  id: string;
  branch_id: string;
  academic_year: number;
  course_code: string | null;
  tuition_fee: number | null;
  hostel_fee: number | null;
  transport_fee: number | null;
  application_fee: number | null;
  seat_lock_amount: number | null;
  other_fee_notes: string | null;
  currency: string;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeatInventorySnapshot {
  id: string;
  branch_id: string;
  course_code: string | null;
  capacity_total: number;
  capacity_available: number;
  captured_at: string;
  source_note: string | null;
  created_at: string;
}

export interface PartnerBranchImportBatch {
  id: string;
  source_name: string;
  source_path: string | null;
  row_count: number;
  matched_branch_count: number;
  imported_by_user_id: string | null;
  import_status: PartnerBranchImportStatus;
  error_message: string | null;
  imported_at: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerBranchVerification {
  id: string;
  import_batch_id: string;
  institution_name: string;
  institution_id: string | null;
  state: string;
  district: string;
  city: string;
  area: string;
  pincode: string | null;
  address: string;
  location_type: string;
  confidence: string;
  source_url: string | null;
  notes: string | null;
  normalized_key: string;
  existing_branch_id: string | null;
  verification_status: PartnerBranchVerificationStatus;
  verification_notes: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  promoted_at: string | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  organization_id?: string | null;
  source?: string | null;
  source_campaign?: string | null;
  source_medium?: string | null;
  source_ref?: string | null;
  source_lead_id: string | null;
  student_name: string | null;
  parent_name: string | null;
  phone?: string | null;
  alt_phone?: string | null;
  student_phone: string | null;
  parent_phone: string | null;
  district: string | null;
  city: string | null;
  area?: string | null;
  pincode: string | null;
  category_interest?: "intermediate" | "btech" | "degree" | null;
  preferred_language: string | null;
  course_interest: string | null;
  hostel_required: boolean;
  preferred_location?: string | null;
  budget_range?: string | null;
  current_status?: string | null;
  sub_status?: string | null;
  intent_score?: number | null;
  marks_10th: number | null;
  joining_year: number | null;
  minor_flag: boolean;
  assigned_branch_id: string | null;
  preferred_branch_id: string | null;
  lead_score: number;
  bot_state: BotState | null;
  stage: LeadStage;
  status: LeadStatus;
  notes?: string | null;
  raw_payload_json?: Record<string, unknown>;
  assigned_to?: string | null;
  last_contacted_at?: string | null;
  last_incoming_at: string | null;
  last_outgoing_at: string | null;
  last_human_contact_at: string | null;
  seat_lock_paid: boolean;
  seat_lock_amount: number | null;
  payment_status: PaymentStatus | null;
  admission_status: string | null;
  owner_user_id: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadOptIn {
  id: string;
  lead_id: string;
  channel: ConversationChannel;
  status: LeadOptInStatus;
  captured_from: string | null;
  captured_at: string | null;
  expires_at: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LeadEvent {
  id: string;
  lead_id: string;
  event_type: string;
  event_source: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Conversation {
  id: string;
  lead_id: string;
  channel: ConversationChannel;
  direction: ConversationDirection;
  message_type: ConversationMessageType;
  provider_message_id: string | null;
  message_body: string | null;
  media_url: string | null;
  template_name: string | null;
  delivery_status: ConversationDeliveryStatus;
  created_at: string;
}

export interface AdmissionForm {
  id: string;
  lead_id: string;
  branch_id: string;
  student_name: string;
  father_name: string | null;
  mother_name: string | null;
  parent_phone: string;
  student_phone: string | null;
  address: string;
  district: string;
  course_selected: string;
  hostel_required: boolean;
  marks_10th: number | null;
  documents: AdmissionDocument[];
  submission_status: AdmissionSubmissionStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  lead_id: string;
  branch_id: string;
  admission_form_id?: string | null;
  program_id?: string | null;
  gateway: PaymentGateway;
  provider?: "razorpay";
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  gateway_link_id: string | null;
  amount: number;
  currency: string;
  purpose: string;
  status: PaymentStatus;
  metadata_json?: Record<string, unknown>;
  webhook_payload: Record<string, unknown>;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  lead_id: string;
  branch_id: string | null;
  assigned_to: string | null;
  task_type: TaskType;
  title?: string | null;
  description?: string | null;
  priority: TaskPriority;
  due_at: string | null;
  status: TaskStatus;
  auto_generated?: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  source_batch: string | null;
  template_name: string;
  target_count: number;
  sent_count: number;
  reply_count: number;
  qualified_count: number;
  payment_count: number;
  admission_count: number;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

export interface CommissionRule {
  id: string;
  institution_id: string;
  branch_id: string | null;
  course_code: string | null;
  payout_amount: number;
  currency: string;
  trigger: CommissionTrigger;
  payout_days: number;
  refund_clawback: boolean;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdmissionAttribution {
  id: string;
  lead_id: string;
  institution_id: string;
  branch_id: string | null;
  source_campaign_id: string | null;
  source_channel: string | null;
  attribution_code: string | null;
  referred_by_name: string | null;
  referral_phone: string | null;
  status: AttributionStatus;
  joined_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutLedger {
  id: string;
  attribution_id: string;
  institution_id: string;
  branch_id: string | null;
  commission_rule_id: string | null;
  gross_amount: number;
  net_amount: number;
  currency: string;
  status: PayoutStatus;
  due_at: string | null;
  paid_at: string | null;
  external_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
}

export interface BranchProfile extends Branch {
  assets: BranchAsset[];
  highlights: string[];
  institution_name?: string | null;
  branch_contacts?: BranchContact[];
  trust_assets?: BranchTrustAsset[];
  review_snapshots?: BranchReview[];
  trust_score?: number | null;
  trust_band?: BranchTrustBand | null;
  primary_review?: BranchReview | null;
  latest_fee_snapshot?: BranchFeeSnapshot | null;
  latest_seat_snapshot?: SeatInventorySnapshot | null;
}

export interface BranchRecommendationRuleScore {
  key: string;
  label: string;
  score: number;
  matched: boolean;
  detail?: string;
}

export interface BranchRecommendation {
  branch_id: string;
  branch_code: string;
  branch_name: string;
  district: string;
  city: string;
  score: number;
  reasons: string[];
  rule_scores: BranchRecommendationRuleScore[];
  recommendation_basis?: "geo" | "cluster" | "pincode" | "default" | "standard";
  geo_cluster?: BranchGeoCluster | null;
  pilot_scope?: string | null;
}

export interface DashboardMetric {
  label: string;
  value: string;
  helper: string;
  tone: "neutral" | "positive" | "attention";
}

export interface DashboardStageCount {
  stage: LeadStage;
  count: number;
}

export interface DashboardRecentEvent {
  id: string;
  lead_id: string;
  lead_name: string;
  event_type: string;
  created_at: string;
}

export interface DashboardBranchPerformance {
  branch_id: string;
  name: string;
  district: string;
  hot_leads: number;
  seat_locked: number;
  capacity_available: number;
}

export interface PartnerBranchVerificationRow extends PartnerBranchVerification {
  import_batch_source_name?: string | null;
  existing_branch_name?: string | null;
  existing_branch_code?: string | null;
  institution_display_name?: string | null;
  branch_verification_status?: Branch["verification_status"] | null;
}

export interface PartnerBranchVerificationSnapshot {
  source_label: string;
  total_rows: number;
  matched_rows: number;
  rows: PartnerBranchVerificationRow[];
  status_counts: Array<{ status: PartnerBranchVerificationStatus; count: number }>;
  confidence_counts: Array<{ confidence: string; count: number }>;
  import_batches: PartnerBranchImportBatch[];
}

export interface DashboardSnapshot {
  metrics: DashboardMetric[];
  stage_counts: DashboardStageCount[];
  recent_events: DashboardRecentEvent[];
  hot_leads: Lead[];
  task_queue: Task[];
  campaigns: Campaign[];
  branch_performance: DashboardBranchPerformance[];
}

export interface LeadScoreFactor {
  key: string;
  label: string;
  points: number;
  applied: boolean;
}

export interface LeadScoreSummary {
  score: number;
  band: LeadScoreBand;
  status: LeadStatus;
  factors: LeadScoreFactor[];
}

export interface TaskQueueItem extends Task {
  lead_name: string;
  parent_phone: string | null;
  branch_name: string | null;
  assignee_name: string | null;
  lead_stage: LeadStage;
  lead_status: LeadStatus;
  lead_score: number;
}

export interface TaskQueueSnapshot {
  data_source: AppDataSource;
  source_label: string;
  open_count: number;
  urgent_count: number;
  overdue_count: number;
  items: TaskQueueItem[];
  users?: Array<Pick<User, "id" | "name">>;
}

export interface CampaignAnalyticsRow extends Campaign {
  hot_leads: number;
  pending_payments: number;
  reply_rate: number;
  qualification_rate: number;
  payment_rate: number;
  admission_rate: number;
}

export interface CampaignAnalyticsSnapshot {
  data_source: AppDataSource;
  source_label: string;
  rows: CampaignAnalyticsRow[];
}

export interface BranchAnalyticsRow {
  branch_id: string;
  name: string;
  district: string;
  city: string;
  total_leads: number;
  qualified_leads: number;
  hot_leads: number;
  callback_requested: number;
  visit_requested: number;
  payment_pending: number;
  seat_locked: number;
  admissions_won: number;
  capacity_available: number;
  conversion_rate: number;
}

export interface BranchAnalyticsSnapshot {
  data_source: AppDataSource;
  source_label: string;
  rows: BranchAnalyticsRow[];
}

export interface BranchTrustFactor {
  key: string;
  label: string;
  points: number;
  applied: boolean;
  max_points: number;
}

export interface BranchTrustSummary {
  score: number;
  band: BranchTrustBand;
  review_rating: number | null;
  review_count: number;
  factors: BranchTrustFactor[];
}
