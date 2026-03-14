import type {
  AdmissionForm,
  AdmissionAttribution,
  BotState,
  Branch,
  BranchAsset,
  BranchContact,
  BranchFeeSnapshot,
  BranchReview,
  BranchReviewSource,
  BranchTrustAsset,
  BranchTrustAssetType,
  Campaign,
  CampaignStatus,
  CommissionRule,
  Conversation,
  Institution,
  InstitutionStatus,
  Lead,
  LeadEvent,
  LeadOptIn,
  LeadOptInStatus,
  LeadStage,
  LeadStatus,
  Payment,
  PartnerBranchImportBatch,
  PartnerBranchImportStatus,
  PartnerBranchVerification,
  PartnerBranchVerificationStatus,
  PayoutLedger,
  PayoutStatus,
  AttributionStatus,
  CommissionTrigger,
  SeatInventorySnapshot,
  Task,
  User,
} from "@/types/domain";
import type {
  AdmissionCycle,
  AuditLog,
  BranchVerificationStatus,
  CommissionLedger,
  CommissionLedgerStatus,
  ConversationThread,
  ConversationThreadStatus,
  Conversion,
  FeeFrequency,
  FeeStructure,
  InstitutionPublicationStatus,
  FeeType,
  MessageEvent,
  ObjectionLog,
  ObjectionSeverity,
  ObjectionType,
  Organization,
  OrganizationCommunicationSetting,
  OrganizationType,
  Program,
  ProgramCategory,
  Recommendation,
  RequiredDocument,
  RequiredDocumentStage,
  SetupWizardDraft,
  TemplateRegistryItem,
  VisitBooking,
  VisitBookingStatus,
  VisitOutcomeStatus,
  JoinedStatus,
} from "@/types/operations";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type MutationShape<TEntity> = Partial<TEntity>;

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: Lead;
        Insert: MutationShape<Lead>;
        Update: MutationShape<Lead>;
        Relationships: [];
      };
      branches: {
        Row: Branch;
        Insert: MutationShape<Branch>;
        Update: MutationShape<Branch>;
        Relationships: [];
      };
      institutions: {
        Row: Institution;
        Insert: MutationShape<Institution>;
        Update: MutationShape<Institution>;
        Relationships: [];
      };
      organizations: {
        Row: Organization;
        Insert: MutationShape<Organization>;
        Update: MutationShape<Organization>;
        Relationships: [];
      };
      branch_assets: {
        Row: BranchAsset;
        Insert: MutationShape<BranchAsset>;
        Update: MutationShape<BranchAsset>;
        Relationships: [];
      };
      branch_contacts: {
        Row: BranchContact;
        Insert: MutationShape<BranchContact>;
        Update: MutationShape<BranchContact>;
        Relationships: [];
      };
      branch_trust_assets: {
        Row: BranchTrustAsset;
        Insert: MutationShape<BranchTrustAsset>;
        Update: MutationShape<BranchTrustAsset>;
        Relationships: [];
      };
      branch_reviews: {
        Row: BranchReview;
        Insert: MutationShape<BranchReview>;
        Update: MutationShape<BranchReview>;
        Relationships: [];
      };
      branch_fee_snapshots: {
        Row: BranchFeeSnapshot;
        Insert: MutationShape<BranchFeeSnapshot>;
        Update: MutationShape<BranchFeeSnapshot>;
        Relationships: [];
      };
      seat_inventory_snapshots: {
        Row: SeatInventorySnapshot;
        Insert: MutationShape<SeatInventorySnapshot>;
        Update: MutationShape<SeatInventorySnapshot>;
        Relationships: [];
      };
      programs: {
        Row: Program;
        Insert: MutationShape<Program>;
        Update: MutationShape<Program>;
        Relationships: [];
      };
      fee_structures: {
        Row: FeeStructure;
        Insert: MutationShape<FeeStructure>;
        Update: MutationShape<FeeStructure>;
        Relationships: [];
      };
      admission_cycles: {
        Row: AdmissionCycle;
        Insert: MutationShape<AdmissionCycle>;
        Update: MutationShape<AdmissionCycle>;
        Relationships: [];
      };
      required_documents: {
        Row: RequiredDocument;
        Insert: MutationShape<RequiredDocument>;
        Update: MutationShape<RequiredDocument>;
        Relationships: [];
      };
      lead_events: {
        Row: LeadEvent;
        Insert: MutationShape<LeadEvent>;
        Update: MutationShape<LeadEvent>;
        Relationships: [];
      };
      conversations: {
        Row: Conversation;
        Insert: MutationShape<Conversation>;
        Update: MutationShape<Conversation>;
        Relationships: [];
      };
      conversation_threads: {
        Row: ConversationThread;
        Insert: MutationShape<ConversationThread>;
        Update: MutationShape<ConversationThread>;
        Relationships: [];
      };
      message_events: {
        Row: MessageEvent;
        Insert: MutationShape<MessageEvent>;
        Update: MutationShape<MessageEvent>;
        Relationships: [];
      };
      recommendations: {
        Row: Recommendation;
        Insert: MutationShape<Recommendation>;
        Update: MutationShape<Recommendation>;
        Relationships: [];
      };
      objection_logs: {
        Row: ObjectionLog;
        Insert: MutationShape<ObjectionLog>;
        Update: MutationShape<ObjectionLog>;
        Relationships: [];
      };
      admission_forms: {
        Row: AdmissionForm;
        Insert: MutationShape<AdmissionForm>;
        Update: MutationShape<AdmissionForm>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: MutationShape<Payment>;
        Update: MutationShape<Payment>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: MutationShape<Task>;
        Update: MutationShape<Task>;
        Relationships: [];
      };
      visit_bookings: {
        Row: VisitBooking;
        Insert: MutationShape<VisitBooking>;
        Update: MutationShape<VisitBooking>;
        Relationships: [];
      };
      campaigns: {
        Row: Campaign;
        Insert: MutationShape<Campaign>;
        Update: MutationShape<Campaign>;
        Relationships: [];
      };
      commission_rules: {
        Row: CommissionRule;
        Insert: MutationShape<CommissionRule>;
        Update: MutationShape<CommissionRule>;
        Relationships: [];
      };
      admission_attributions: {
        Row: AdmissionAttribution;
        Insert: MutationShape<AdmissionAttribution>;
        Update: MutationShape<AdmissionAttribution>;
        Relationships: [];
      };
      payout_ledger: {
        Row: PayoutLedger;
        Insert: MutationShape<PayoutLedger>;
        Update: MutationShape<PayoutLedger>;
        Relationships: [];
      };
      conversions: {
        Row: Conversion;
        Insert: MutationShape<Conversion>;
        Update: MutationShape<Conversion>;
        Relationships: [];
      };
      commission_ledgers: {
        Row: CommissionLedger;
        Insert: MutationShape<CommissionLedger>;
        Update: MutationShape<CommissionLedger>;
        Relationships: [];
      };
      lead_opt_ins: {
        Row: LeadOptIn;
        Insert: MutationShape<LeadOptIn>;
        Update: MutationShape<LeadOptIn>;
        Relationships: [];
      };
      organization_communication_settings: {
        Row: OrganizationCommunicationSetting;
        Insert: MutationShape<OrganizationCommunicationSetting>;
        Update: MutationShape<OrganizationCommunicationSetting>;
        Relationships: [];
      };
      template_registry: {
        Row: TemplateRegistryItem;
        Insert: MutationShape<TemplateRegistryItem>;
        Update: MutationShape<TemplateRegistryItem>;
        Relationships: [];
      };
      setup_wizard_drafts: {
        Row: SetupWizardDraft;
        Insert: MutationShape<SetupWizardDraft>;
        Update: MutationShape<SetupWizardDraft>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLog;
        Insert: MutationShape<AuditLog>;
        Update: MutationShape<AuditLog>;
        Relationships: [];
      };
      partner_branch_import_batches: {
        Row: PartnerBranchImportBatch;
        Insert: MutationShape<PartnerBranchImportBatch>;
        Update: MutationShape<PartnerBranchImportBatch>;
        Relationships: [];
      };
      partner_branch_verifications: {
        Row: PartnerBranchVerification;
        Insert: MutationShape<PartnerBranchVerification>;
        Update: MutationShape<PartnerBranchVerification>;
        Relationships: [];
      };
      users: {
        Row: User;
        Insert: MutationShape<User>;
        Update: MutationShape<User>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      lead_stage: LeadStage;
      lead_status: LeadStatus;
      lead_bot_state: BotState;
      campaign_status: CampaignStatus;
      institution_status: InstitutionStatus;
      branch_trust_asset_type: BranchTrustAssetType;
      branch_review_source: BranchReviewSource;
      commission_trigger: CommissionTrigger;
      attribution_status: AttributionStatus;
      payout_status: PayoutStatus;
      lead_opt_in_status: LeadOptInStatus;
      partner_branch_verification_status: PartnerBranchVerificationStatus;
      partner_branch_import_status: PartnerBranchImportStatus;
      organization_type: OrganizationType;
      institution_publication_status: InstitutionPublicationStatus;
      branch_verification_status: BranchVerificationStatus;
      program_category: ProgramCategory;
      fee_type: FeeType;
      fee_frequency: FeeFrequency;
      required_document_stage: RequiredDocumentStage;
      objection_type: ObjectionType;
      objection_severity: ObjectionSeverity;
      visit_booking_status: VisitBookingStatus;
      visit_outcome_status: VisitOutcomeStatus;
      joined_status: JoinedStatus;
      commission_ledger_status: CommissionLedgerStatus;
      conversation_thread_status: ConversationThreadStatus;
    };
  };
}

export type TableName = keyof Database["public"]["Tables"];
export type TableRow<TTable extends TableName> = Database["public"]["Tables"][TTable]["Row"];
export type TableInsert<TTable extends TableName> = Database["public"]["Tables"][TTable]["Insert"];
export type TableUpdate<TTable extends TableName> = Database["public"]["Tables"][TTable]["Update"];
