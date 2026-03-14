import { readFile } from "fs/promises";
import { resolve } from "path";

import * as XLSX from "xlsx";
import { z } from "zod";

const optionalText = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const text = String(value).trim();
    return text.length > 0 ? text : null;
  });

const requiredText = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().min(1));

const partnerBranchMasterRowSchema = z.object({
  institution: requiredText,
  state: requiredText,
  district: requiredText,
  city: requiredText,
  area: requiredText,
  pincode: optionalText,
  address: requiredText,
  location_type: requiredText,
  confidence: requiredText,
  source_url: optionalText,
  notes: optionalText,
});

export type PartnerBranchMasterRow = z.infer<typeof partnerBranchMasterRowSchema>;

export const partnerBranchMasterRelativePath = "data/partners/college-branch-master-ap-ts.csv";

export function getDefaultPartnerBranchMasterPath() {
  return resolve(process.cwd(), partnerBranchMasterRelativePath);
}

export function normalizeBranchLookupValue(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildPartnerBranchNormalizedKey(row: PartnerBranchMasterRow) {
  return [
    row.institution,
    row.state,
    row.district,
    row.city,
    row.area,
    row.pincode ?? "",
    row.address,
  ]
    .map((value) => normalizeBranchLookupValue(value))
    .join("|");
}

export function parsePartnerBranchMasterRows(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) {
    throw new Error("Partner branch master file does not contain any sheets.");
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
    defval: "",
  });

  return rawRows.map((row, index) => {
    try {
      return partnerBranchMasterRowSchema.parse(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Partner branch master row ${index + 2} is invalid: ${error.issues[0]?.message ?? "Unknown error"}`);
      }

      throw error;
    }
  });
}

export async function loadPartnerBranchMasterRowsFromFile(filePath = getDefaultPartnerBranchMasterPath()) {
  const buffer = await readFile(filePath);
  return parsePartnerBranchMasterRows(buffer);
}
