import type { TableInsert } from "@/types/database";
import type { BotState, LeadStage, LeadStatus } from "@/types/domain";

export type LeadImportFormat = "tirupathi_school_v1" | "ap_inter_v1" | "generic";
export type LeadImportRowStatus = "valid" | "invalid" | "duplicate";

export interface ImportedLeadRow {
  row_number: number;
  source_file: string;
  source_sheet: string;
  detected_format: LeadImportFormat;
  source_lead_id: string | null;
  student_name: string | null;
  parent_name: string | null;
  secondary_parent_name: string | null;
  parent_phone: string | null;
  student_phone: string | null;
  district: string | null;
  city: string | null;
  pincode: string | null;
  preferred_language: string | null;
  course_interest: string | null;
  hostel_required: boolean;
  bot_state: BotState;
  stage: LeadStage;
  status: LeadStatus;
  lead_score: number;
  issues: string[];
  raw_row: Record<string, string>;
}

export interface LeadImportPreview {
  file_name: string;
  detected_format: LeadImportFormat;
  sheet_name: string;
  headers: string[];
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  unique_phone_count: number;
  sample_rows: ImportedLeadRow[];
}

export interface LeadImportCommitResult extends LeadImportPreview {
  inserted_rows: number;
  inserted_events: number;
}

export interface WorkbookSheetSelection {
  fileName: string;
  sheetName: string;
  headers: string[];
  detectedFormat: LeadImportFormat;
  totalRows: number;
}

export interface LeadImportPreparedBatchRow {
  lead: TableInsert<"leads">;
  event: TableInsert<"lead_events">;
}
