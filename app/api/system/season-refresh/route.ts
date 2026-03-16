import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { operatorErrorResponse, requireApiOperator } from "@/lib/auth/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const payloadSchema = z.object({
  institutionId: z.string().uuid().optional(),
  academicYear: z.string().min(4),
  copyFees: z.boolean().optional().default(true),
  archivePreviousFees: z.boolean().optional().default(true),
});

type BranchRow = { id: string; institution_id: string | null };
type ProgramRow = { id: string; branch_id: string };
type FeeRow = {
  id: string;
  program_id: string;
  academic_year: string;
  fee_type: string;
  amount: number;
  frequency: string;
  installment_available: boolean;
  installment_notes: string | null;
  scholarship_notes: string | null;
  refund_policy: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireApiOperator(["admin", "operations"]);
    const payload = payloadSchema.parse(await request.json());
    const supabase = createAdminSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 503 });
    }

    const institutionResponse = payload.institutionId
      ? await supabase.from("institutions").select("id").eq("id", payload.institutionId).maybeSingle()
      : await supabase.from("institutions").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
    const institutionRow = institutionResponse.data as { id: string } | null;

    if (!institutionRow?.id) {
      return NextResponse.json({ error: "No institution found to refresh." }, { status: 400 });
    }

    const existingCycleResponse = await supabase
      .from("admission_cycles")
      .select("id")
      .eq("institution_id", institutionRow.id)
      .eq("academic_year", payload.academicYear)
      .maybeSingle();
    const existingCycle = existingCycleResponse.data as { id: string } | null;

    if (existingCycle?.id) {
      return NextResponse.json({ error: "Academic year already exists for this institution." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const cycleId = randomUUID();
    const { error: cycleError } = await supabase.from("admission_cycles").insert(
      [
      {
        id: cycleId,
        institution_id: institutionRow.id,
        name: `Admissions ${payload.academicYear}`,
        academic_year: payload.academicYear,
        admissions_open: false,
        application_start_date: null,
        application_end_date: null,
        counseling_start_date: null,
        counseling_end_date: null,
        spot_admission_start_date: null,
        spot_admission_end_date: null,
        classes_start_date: null,
        created_at: now,
        updated_at: now,
      },
    ] as never,
    );

    if (cycleError) {
      throw new Error(cycleError.message);
    }

    let copiedFees = 0;
    const archivedFees = 0;

    if (payload.copyFees) {
      const [branchResponse, programResponse] = await Promise.all([
        supabase.from("branches").select("id, institution_id"),
        supabase.from("programs").select("id, branch_id"),
      ]);
      const branchRows = (branchResponse.data ?? []) as BranchRow[];
      const programRows = (programResponse.data ?? []) as ProgramRow[];

      const institutionBranches = branchRows.filter((branch) => branch.institution_id === institutionRow.id);
      const institutionBranchIds = new Set(institutionBranches.map((branch) => branch.id));
      const institutionPrograms = programRows.filter((program) => institutionBranchIds.has(program.branch_id));
      const programIds = institutionPrograms.map((program) => program.id);

      if (programIds.length > 0 && payload.archivePreviousFees) {
        const { error: archiveError } = await supabase
          .from("fee_structures")
          .update({ is_current: false } as never)
          .in("program_id", programIds)
          .eq("is_current", true);

        if (archiveError) {
          throw new Error(archiveError.message);
        }
      }

      if (programIds.length > 0) {
        const feeResponse = await supabase
          .from("fee_structures")
          .select(
            "id, program_id, academic_year, fee_type, amount, frequency, installment_available, installment_notes, scholarship_notes, refund_policy, is_current, created_at, updated_at",
          )
          .in("program_id", programIds)
          .eq("is_current", true);
        const feeRows = (feeResponse.data ?? []) as FeeRow[];

        const rowsToCopy = feeRows;
        if (rowsToCopy.length > 0) {
          const nextFees = rowsToCopy.map((row) => ({
            ...row,
            id: randomUUID(),
            academic_year: payload.academicYear,
            is_current: true,
            created_at: now,
            updated_at: now,
          }));

          const { error: insertError } = await supabase.from("fee_structures").insert(nextFees as never);
          if (insertError) {
            throw new Error(insertError.message);
          }

          copiedFees = nextFees.length;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      institution_id: institutionRow.id,
      admission_cycle_id: cycleId,
      academic_year: payload.academicYear,
      copied_fees: copiedFees,
      archived_fees: archivedFees,
    });
  } catch (error) {
    return operatorErrorResponse(error, "Season refresh failed.");
  }
}
