import { randomUUID } from "crypto";

import * as XLSX from "xlsx";

import { branchRecommendationPriority } from "@/lib/branch-matching/rules";
import {
  cleanCell,
  deriveCityFromDistrict,
  inferCourseFromFilename,
  normalizeDistrict,
  normalizePhoneNumber,
  normalizePincode,
  slugifyFilename,
} from "@/lib/import/normalizers";
import type {
  ImportedLeadRow,
  LeadImportCommitResult,
  LeadImportPreparedBatchRow,
  LeadImportPreview,
  LeadImportRowStatus,
  WorkbookSheetSelection,
} from "@/lib/import/types";

const tirupathiHeaders = [
  "School Name",
  "Name",
  "Mother Name",
  "Father Name",
  "Address",
  "Pincode",
  "Mobile No.",
  "Alternate Mobile No.",
  "Contact Email Id",
  "Academic Stream",
  "District",
] as const;

const apInterHeaders = [
  "COLLEGE NAME",
  "COLLEGE DISTRICT",
  "CATEGORY",
  "ROLLNO",
  "COURSE_NAME",
  "STU_NAME",
  "GENDER",
  "STU_MOBILENO",
  "FNAME",
  "MNAME",
  "STU_DIST_NAME",
  "HNO",
  "STREET",
  "STU_ADDRESS",
  "PINCODE",
] as const;

function isSheetMatchingHeaders(headers: string[], expectedHeaders: readonly string[]) {
  return expectedHeaders.every((header) => headers.includes(header));
}

function detectFormat(headers: string[]) {
  if (isSheetMatchingHeaders(headers, tirupathiHeaders)) {
    return "tirupathi_school_v1" as const;
  }

  if (isSheetMatchingHeaders(headers, apInterHeaders)) {
    return "ap_inter_v1" as const;
  }

  return "generic" as const;
}

function selectWorkbookSheet(buffer: Buffer, fileName: string) {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false, dense: false });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
    const headers = (rows[0] ?? []).map((value) => cleanCell(value)).filter(Boolean);

    if (headers.length === 0) {
      continue;
    }

    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");

    return {
      workbook,
      sheet,
      selection: {
        fileName,
        sheetName,
        headers,
        detectedFormat: detectFormat(headers),
        totalRows: Math.max(0, range.e.r),
      } satisfies WorkbookSheetSelection,
    };
  }

  throw new Error(`No readable sheet found in ${fileName}.`);
}

function getCellValue(sheet: XLSX.WorkSheet, rowIndex: number, columnIndex: number) {
  const address = XLSX.utils.encode_cell({ c: columnIndex, r: rowIndex });
  return cleanCell(sheet[address]?.w ?? sheet[address]?.v ?? "");
}

function buildRawRow(sheet: XLSX.WorkSheet, headers: string[], rowIndex: number) {
  return headers.reduce<Record<string, string>>((accumulator, header, columnIndex) => {
    accumulator[header] = getCellValue(sheet, rowIndex, columnIndex);
    return accumulator;
  }, {});
}

function computeBotState(row: Pick<ImportedLeadRow, "student_name" | "district" | "course_interest">) {
  if (!row.student_name) return "awaiting_student_name" as const;
  if (!row.district) return "awaiting_district" as const;
  if (!row.course_interest) return "awaiting_course" as const;
  return "awaiting_hostel" as const;
}

function resolveStatus({ phone, duplicate }: { phone: string | null; duplicate: boolean }) {
  if (!phone) {
    return {
      importStatus: "invalid" as LeadImportRowStatus,
      leadStatus: "invalid" as const,
      leadScore: -100,
      issues: ["Missing or invalid phone number"],
    };
  }

  if (duplicate) {
    return {
      importStatus: "duplicate" as LeadImportRowStatus,
      leadStatus: "duplicate" as const,
      leadScore: 0,
      issues: ["Duplicate phone number detected"],
    };
  }

  return {
    importStatus: "valid" as LeadImportRowStatus,
    leadStatus: "new" as const,
    leadScore: 0,
    issues: [],
  };
}

function mapRow({
  rawRow,
  rowNumber,
  sourceFile,
  sourceSheet,
  detectedFormat,
}: {
  rawRow: Record<string, string>;
  rowNumber: number;
  sourceFile: string;
  sourceSheet: string;
  detectedFormat: WorkbookSheetSelection["detectedFormat"];
}): Omit<ImportedLeadRow, "bot_state" | "status" | "lead_score" | "issues"> {
  const inferredCourse = inferCourseFromFilename(sourceFile);

  if (detectedFormat === "tirupathi_school_v1") {
    const primaryPhone = normalizePhoneNumber(rawRow["Mobile No."] || rawRow["Alternate Mobile No."]);
    const secondaryPhone = normalizePhoneNumber(rawRow["Alternate Mobile No."]);
    const district = normalizeDistrict(rawRow.District);

    return {
      row_number: rowNumber,
      source_file: sourceFile,
      source_sheet: sourceSheet,
      detected_format: detectedFormat,
      source_lead_id: `${slugifyFilename(sourceFile)}-${rowNumber}`,
      student_name: rawRow.Name || null,
      parent_name: rawRow["Father Name"] || rawRow["Mother Name"] || null,
      secondary_parent_name: rawRow["Mother Name"] || null,
      parent_phone: primaryPhone,
      student_phone: secondaryPhone && secondaryPhone !== primaryPhone ? secondaryPhone : null,
      district,
      city: deriveCityFromDistrict(district),
      pincode: normalizePincode(rawRow.Pincode),
      preferred_language: "te",
      course_interest: rawRow["Academic Stream"] || inferredCourse || null,
      hostel_required: false,
      stage: "imported",
      raw_row: rawRow,
    };
  }

  if (detectedFormat === "ap_inter_v1") {
    const studentPhone = normalizePhoneNumber(rawRow.STU_MOBILENO);
    const district = normalizeDistrict(rawRow.STU_DIST_NAME || rawRow["COLLEGE DISTRICT"]);

    return {
      row_number: rowNumber,
      source_file: sourceFile,
      source_sheet: sourceSheet,
      detected_format: detectedFormat,
      source_lead_id: rawRow.ROLLNO || `${slugifyFilename(sourceFile)}-${rowNumber}`,
      student_name: rawRow.STU_NAME || null,
      parent_name: rawRow.FNAME || rawRow.MNAME || null,
      secondary_parent_name: rawRow.MNAME || null,
      parent_phone: studentPhone,
      student_phone: studentPhone,
      district,
      city: deriveCityFromDistrict(district),
      pincode: normalizePincode(rawRow.PINCODE),
      preferred_language: "te",
      course_interest: rawRow.COURSE_NAME || inferredCourse || null,
      hostel_required: false,
      stage: "imported",
      raw_row: rawRow,
    };
  }

  const phone =
    normalizePhoneNumber(rawRow["Mobile No."]) ||
    normalizePhoneNumber(rawRow.STU_MOBILENO) ||
    normalizePhoneNumber(rawRow.Phone) ||
    normalizePhoneNumber(rawRow["Phone Number"]);
  const district = normalizeDistrict(rawRow.District || rawRow.STU_DIST_NAME || rawRow.City);

  return {
    row_number: rowNumber,
    source_file: sourceFile,
    source_sheet: sourceSheet,
    detected_format: detectedFormat,
    source_lead_id: `${slugifyFilename(sourceFile)}-${rowNumber}`,
    student_name: rawRow.Name || rawRow.STU_NAME || rawRow["Student Name"] || null,
    parent_name: rawRow["Father Name"] || rawRow.FNAME || rawRow.Parent || null,
    secondary_parent_name: rawRow["Mother Name"] || rawRow.MNAME || null,
    parent_phone: phone,
    student_phone: phone,
    district,
    city: deriveCityFromDistrict(district),
    pincode: normalizePincode(rawRow.Pincode || rawRow.PINCODE),
    preferred_language: "te",
    course_interest: rawRow["Academic Stream"] || rawRow.COURSE_NAME || inferredCourse || null,
    hostel_required: false,
    stage: "imported",
    raw_row: rawRow,
  };
}

function iterateImportedRows({
  buffer,
  fileName,
  existingPhones,
}: {
  buffer: Buffer;
  fileName: string;
  existingPhones?: Iterable<string>;
}) {
  const { sheet, selection } = selectWorkbookSheet(buffer, fileName);
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const seenPhones = new Set(existingPhones ?? []);

  function* generator() {
    for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex += 1) {
      const rawRow = buildRawRow(sheet, selection.headers, rowIndex);

      if (Object.values(rawRow).every((value) => value.length === 0)) {
        continue;
      }

      const mapped = mapRow({
        rawRow,
        rowNumber: rowIndex + 1,
        sourceFile: selection.fileName,
        sourceSheet: selection.sheetName,
        detectedFormat: selection.detectedFormat,
      });
      const phone = mapped.parent_phone ?? mapped.student_phone;
      const duplicate = Boolean(phone && seenPhones.has(phone));
      const { importStatus, leadStatus, leadScore, issues } = resolveStatus({ phone, duplicate });

      if (phone && !duplicate) {
        seenPhones.add(phone);
      }

      const row: ImportedLeadRow = {
        ...mapped,
        bot_state: computeBotState(mapped),
        status: leadStatus,
        lead_score: leadScore,
        issues,
      };

      yield { row, phone, importStatus };
    }
  }

  return { selection, rows: generator() };
}

export function previewLeadImport({
  buffer,
  fileName,
  existingPhones = [],
  sampleSize = 25,
}: {
  buffer: Buffer;
  fileName: string;
  existingPhones?: Iterable<string>;
  sampleSize?: number;
}): LeadImportPreview {
  const { selection, rows } = iterateImportedRows({ buffer, fileName, existingPhones });
  const sampleRows: ImportedLeadRow[] = [];
  let validRows = 0;
  let invalidRows = 0;
  let duplicateRows = 0;
  let uniquePhoneCount = 0;

  for (const entry of rows) {
    if (entry.importStatus === "valid") validRows += 1;
    if (entry.importStatus === "invalid") invalidRows += 1;
    if (entry.importStatus === "duplicate") duplicateRows += 1;
    if (entry.phone && entry.importStatus === "valid") uniquePhoneCount += 1;
    if (sampleRows.length < sampleSize) sampleRows.push(entry.row);
  }

  return {
    file_name: fileName,
    detected_format: selection.detectedFormat,
    sheet_name: selection.sheetName,
    headers: selection.headers,
    total_rows: selection.totalRows,
    valid_rows: validRows,
    invalid_rows: invalidRows,
    duplicate_rows: duplicateRows,
    unique_phone_count: uniquePhoneCount,
    sample_rows: sampleRows,
  };
}

export async function commitLeadImport({
  buffer,
  fileName,
  existingPhones = [],
  batchSize = 500,
  insertBatch,
}: {
  buffer: Buffer;
  fileName: string;
  existingPhones?: Iterable<string>;
  batchSize?: number;
  insertBatch: (rows: LeadImportPreparedBatchRow[]) => Promise<void>;
}): Promise<LeadImportCommitResult> {
  const { selection, rows } = iterateImportedRows({ buffer, fileName, existingPhones });
  const sampleRows: ImportedLeadRow[] = [];
  const batch: LeadImportPreparedBatchRow[] = [];
  let validRows = 0;
  let invalidRows = 0;
  let duplicateRows = 0;
  let uniquePhoneCount = 0;
  let insertedRows = 0;
  let insertedEvents = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    const count = batch.length;
    await insertBatch(batch.splice(0, count));
    insertedRows += count;
    insertedEvents += count;
  };

  for (const entry of rows) {
    if (entry.importStatus === "valid") validRows += 1;
    if (entry.importStatus === "invalid") invalidRows += 1;
    if (entry.importStatus === "duplicate") duplicateRows += 1;
    if (entry.phone && entry.importStatus === "valid") uniquePhoneCount += 1;
    if (sampleRows.length < 25) sampleRows.push(entry.row);

    if (entry.importStatus !== "valid") {
      continue;
    }

    const leadId = randomUUID();
    batch.push({
      lead: {
        id: leadId,
        source_lead_id: entry.row.source_lead_id,
        student_name: entry.row.student_name,
        parent_name: entry.row.parent_name,
        student_phone: entry.row.student_phone,
        parent_phone: entry.row.parent_phone,
        district: entry.row.district,
        city: entry.row.city,
        pincode: entry.row.pincode,
        preferred_language: entry.row.preferred_language,
        course_interest: entry.row.course_interest,
        hostel_required: entry.row.hostel_required,
        marks_10th: null,
        joining_year: new Date().getFullYear(),
        minor_flag: true,
        assigned_branch_id: null,
        preferred_branch_id: null,
        lead_score: entry.row.lead_score,
        bot_state: entry.row.bot_state,
        stage: entry.row.stage,
        status: entry.row.status,
        seat_lock_paid: false,
        owner_user_id: null,
        utm_source: "excel_import",
        utm_campaign: slugifyFilename(fileName),
      },
      event: {
        lead_id: leadId,
        event_type: "lead_imported",
        event_source: "import",
        payload: {
          source_file: fileName,
          source_sheet: entry.row.source_sheet,
          row_number: entry.row.row_number,
          format: entry.row.detected_format,
          issues: entry.row.issues,
          raw_row: entry.row.raw_row,
          secondary_parent_name: entry.row.secondary_parent_name,
          recommendation_rules: branchRecommendationPriority,
        },
      },
    });

    if (batch.length >= batchSize) {
      await flush();
    }
  }

  await flush();

  return {
    file_name: fileName,
    detected_format: selection.detectedFormat,
    sheet_name: selection.sheetName,
    headers: selection.headers,
    total_rows: selection.totalRows,
    valid_rows: validRows,
    invalid_rows: invalidRows,
    duplicate_rows: duplicateRows,
    unique_phone_count: uniquePhoneCount,
    sample_rows: sampleRows,
    inserted_rows: insertedRows,
    inserted_events: insertedEvents,
  };
}

