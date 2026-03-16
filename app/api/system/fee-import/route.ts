import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import * as XLSX from "xlsx";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { log } from "@/lib/log";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { feeFrequencies, feeTypes } from "@/types/operations";

const modeSchema = z.enum(["preview", "commit"]).catch("preview");
const boolSchema = z.preprocess(
  (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return false;
  },
  z.boolean(),
);
const academicYearSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null),
  z.string().min(4).nullable(),
);
const supportedExtensions = [".csv", ".xls", ".xlsx"] as const;

type BranchRow = { id: string; code: string; name: string };
type ProgramRow = { id: string; branch_id: string; code: string; course_name: string };

function hasSupportedExtension(fileName: string) {
  return supportedExtensions.some((extension) => fileName.toLowerCase().endsWith(extension));
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "yes", "y", "1"].includes(normalized);
  }
  return false;
}

function pickValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const normalized = normalizeHeader(key);
    if (Object.prototype.hasOwnProperty.call(row, normalized)) {
      return row[normalized];
    }
  }
  return null;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    await requireApiOperator(["admin", "operations"]);
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = modeSchema.parse(formData.get("mode"));
    const academicYear = academicYearSchema.parse(formData.get("academicYear"));
    const archiveExisting = boolSchema.parse(formData.get("archiveExisting"));

    log.info("fee_import.start", {
      requestId,
      mode,
      academicYear,
      archiveExisting,
      fileName: file instanceof File ? file.name : null,
    });

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Attach a file in the `file` field." }, { status: 400 });
    }

    if (!hasSupportedExtension(file.name)) {
      return NextResponse.json(
        { error: `Unsupported file type. Use ${supportedExtensions.join(", ")}.` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
    const rows = rawRows.map((row) => {
      const normalized: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, value]) => {
        normalized[normalizeHeader(String(key))] = value;
      });
      return normalized;
    });

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 503 });
    }

    const [{ data: branchRows }, { data: programRows }] = await Promise.all([
      supabase.from("branches").select("id, code, name"),
      supabase.from("programs").select("id, branch_id, code, course_name"),
    ]);

    const branches = (branchRows ?? []) as BranchRow[];
    const programs = (programRows ?? []) as ProgramRow[];

    const branchByCode = new Map(branches.map((branch) => [branch.code.toLowerCase(), branch]));
    const branchByName = new Map(branches.map((branch) => [branch.name.toLowerCase(), branch]));

    const programByBranchAndCode = new Map<string, ProgramRow>();
    programs.forEach((program) => {
      programByBranchAndCode.set(`${program.branch_id}:${program.code.toLowerCase()}`, program);
      programByBranchAndCode.set(`${program.branch_id}:${program.course_name.toLowerCase()}`, program);
    });

    const errors: Array<{ row: number; error: string }> = [];
    const inserts: Array<Record<string, unknown>> = [];
    const programIds: string[] = [];
    const now = new Date().toISOString();

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const programIdValue = pickValue(row, ["program_id"]);
      const branchCodeValue = pickValue(row, ["branch_code", "branch"]);
      const branchNameValue = pickValue(row, ["branch_name"]);
      const programCodeValue = pickValue(row, ["program_code", "course_code", "program"]);
      const feeTypeValue = pickValue(row, ["fee_type"]);
      const amountValue = pickValue(row, ["amount", "fee_amount", "value"]);
      const frequencyValue = pickValue(row, ["frequency", "fee_frequency"]);
      const academicYearValue = pickValue(row, ["academic_year", "year"]) ?? academicYear;

      let programId: string | null = null;

      if (typeof programIdValue === "string" && programIdValue.trim().length > 0) {
        programId = programIdValue.trim();
      } else if (programCodeValue && (branchCodeValue || branchNameValue)) {
        const branch =
          typeof branchCodeValue === "string"
            ? branchByCode.get(branchCodeValue.trim().toLowerCase())
            : typeof branchNameValue === "string"
              ? branchByName.get(branchNameValue.trim().toLowerCase())
              : undefined;

        if (branch) {
          const key = `${branch.id}:${String(programCodeValue).trim().toLowerCase()}`;
          const program = programByBranchAndCode.get(key);
          if (program) {
            programId = program.id;
          }
        }
      }

      if (!programId) {
        errors.push({ row: rowNumber, error: "Program not found. Provide program_id or branch_code + program_code." });
        return;
      }

      if (!academicYearValue || typeof academicYearValue !== "string") {
        errors.push({ row: rowNumber, error: "Missing academic_year." });
        return;
      }

      const feeType = typeof feeTypeValue === "string" ? feeTypeValue.trim().toLowerCase() : "";
      if (!feeTypes.includes(feeType as (typeof feeTypes)[number])) {
        errors.push({ row: rowNumber, error: `Invalid fee_type: ${feeTypeValue}` });
        return;
      }

      const amount = toNumber(amountValue);
      if (amount === null) {
        errors.push({ row: rowNumber, error: "Amount is invalid or missing." });
        return;
      }

      const frequencyRaw = typeof frequencyValue === "string" ? frequencyValue.trim().toLowerCase() : "yearly";
      const frequency = feeFrequencies.includes(frequencyRaw as (typeof feeFrequencies)[number]) ? frequencyRaw : "yearly";

      const isCurrent = toBoolean(pickValue(row, ["is_current", "current"]));
      const installmentAvailable = toBoolean(pickValue(row, ["installment_available", "installment"]));

      inserts.push({
        id: randomUUID(),
        program_id: programId,
        academic_year: academicYearValue,
        fee_type: feeType,
        amount,
        frequency,
        installment_available: installmentAvailable,
        installment_notes: pickValue(row, ["installment_notes"]) ?? null,
        scholarship_notes: pickValue(row, ["scholarship_notes"]) ?? null,
        refund_policy: pickValue(row, ["refund_policy"]) ?? null,
        is_current: isCurrent || !pickValue(row, ["is_current", "current"]),
        created_at: now,
        updated_at: now,
      });

      programIds.push(programId);
    });

    if (mode === "preview") {
      const response = {
        mode,
        total_rows: rows.length,
        valid_rows: inserts.length,
        error_rows: errors.length,
        sample_rows: inserts.slice(0, 5),
        errors,
      };
      log.info("fee_import.preview", { requestId, ...response });
      return NextResponse.json(response);
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: "Fix import errors before committing.", errors }, { status: 400 });
    }

    if (archiveExisting && programIds.length > 0) {
      const { error: archiveError } = await supabase
        .from("fee_structures")
        .update({ is_current: false } as never)
        .in("program_id", programIds)
        .eq("is_current", true);

      if (archiveError) {
        throw new Error(archiveError.message);
      }
    }

    const { error: insertError } = await supabase.from("fee_structures").insert(inserts as never);
    if (insertError) {
      throw new Error(insertError.message);
    }

    const result = {
      mode,
      total_rows: rows.length,
      inserted_rows: inserts.length,
    };

    log.info("fee_import.commit", { requestId, ...result });
    return NextResponse.json(result);
  } catch (error) {
    log.error("fee_import.error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return operatorErrorResponse(error, "Fee import failed.");
  }
}
