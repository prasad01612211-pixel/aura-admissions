import { NextResponse } from "next/server";
import { z } from "zod";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { leads as fixtureLeads } from "@/lib/fixtures/demo-data";
import { previewLeadImport } from "@/lib/import/parser";
import { commitLeadImportToLocalStore } from "@/lib/local-import/store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getExistingLeadPhonesFromSupabase, importLeadFileToSupabase } from "@/lib/supabase/live-sync";
import { leadOptInStatuses } from "@/types/domain";

const modeSchema = z.enum(["preview", "commit"]).catch("preview");
const optInStatusSchema = z.enum(leadOptInStatuses).catch("unknown");
const ownerUserIdSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length > 0 ? value : null),
  z.string().uuid().nullable(),
);
const capturedFromSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null),
  z.string().min(2).nullable(),
);
const supportedExtensions = [".csv", ".xls", ".xlsx"] as const;

function hasSupportedExtension(fileName: string) {
  return supportedExtensions.some((extension) => fileName.toLowerCase().endsWith(extension));
}

async function getExistingPhones() {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    return fixtureLeads.flatMap((lead) => [lead.parent_phone, lead.student_phone]).filter(Boolean) as string[];
  }

  return getExistingLeadPhonesFromSupabase(supabase);
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireApiOperator(["admin", "operations"]);
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = modeSchema.parse(formData.get("mode"));
    const optInStatus = optInStatusSchema.parse(formData.get("optInStatus"));
    const ownerUserId = ownerUserIdSchema.parse(formData.get("ownerUserId"));
    const capturedFrom = capturedFromSchema.parse(formData.get("capturedFrom"));

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
    const existingPhones = await getExistingPhones();

    if (mode === "preview") {
      const preview = previewLeadImport({
        buffer,
        fileName: file.name,
        existingPhones,
      });

      return NextResponse.json({
        ...preview,
        recommended_execution: preview.total_rows > 100000 ? "async_or_chunked" : "sync_ok",
      });
    }

    const supabase = createAdminSupabaseClient();

    if (!supabase) {
      const result = await commitLeadImportToLocalStore({
        buffer,
        fileName: file.name,
        existingPhones,
      });

      return NextResponse.json({
        ...result,
        persistence: "local_file_store",
        recommended_execution: result.total_rows > 100000 ? "sync_chunked_local" : "sync_ok",
      });
    }

    const result = await importLeadFileToSupabase({
      supabase,
      buffer,
      fileName: file.name,
      existingPhones,
      optInStatus,
      capturedFrom: capturedFrom ?? "lead_import_api",
      ownerUserId,
    });

    return NextResponse.json({
      ...result,
      recommended_execution: result.total_rows > 100000 ? "move_to_n8n_background_job_next" : "sync_ok",
    });
  } catch (error) {
    return operatorErrorResponse(error, "Import failed");
  }
}
