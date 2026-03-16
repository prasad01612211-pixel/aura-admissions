"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, CircleDashed, ListChecks, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { minimumTrustAssetCount, supportedPrograms } from "@/lib/operations/catalog";
import type { SetupWizardSnapshot, SetupWizardStepKey } from "@/types/operations";

type SetupWizardProps = {
  snapshot: SetupWizardSnapshot;
};

const stepMeta: Record<
  SetupWizardStepKey,
  {
    eyebrow: string;
    description: string;
    guidance: string;
  }
> = {
  organization_profile: {
    eyebrow: "Identity",
    description: "Set the public-facing organization identity that will anchor trust across the product.",
    guidance: "This information powers headers, contact ownership, and the first layer of credibility parents see.",
  },
  institution_details: {
    eyebrow: "Institution",
    description: "Define the institution record clearly so branches, fees, and admissions logic can inherit the right context.",
    guidance: "Keep the academic brand, board, and admissions contact clean before live traffic starts.",
  },
  branch_details: {
    eyebrow: "Branch",
    description: "Lock the branch address and catchment details so recommendations and parent communication feel precise.",
    guidance: "This is where the product becomes operationally local instead of generic.",
  },
  programs_and_intake: {
    eyebrow: "Programs",
    description: "Confirm which courses and intake numbers are active so counselors do not pitch stale inventory.",
    guidance: "The best admissions systems make seat availability and stream positioning feel reliable.",
  },
  fees: {
    eyebrow: "Commercials",
    description: "Anchor tuition and seat-lock figures before payment nudges and counselor scripts go live.",
    guidance: "Parents lose trust fast when fee communication changes mid-funnel.",
  },
  eligibility_and_documents: {
    eyebrow: "Documents",
    description: "Make the checklist explicit so form completion and follow-up tasks stay efficient.",
    guidance: "Clean document rules reduce both parent confusion and counselor back-and-forth.",
  },
  trust_assets: {
    eyebrow: "Trust",
    description: "Bring together proof points, media, and FAQs that strengthen conversion conversations.",
    guidance: "This is the evidence layer behind recommendations, objections, and branch pages.",
  },
  admission_cycle: {
    eyebrow: "Cycle",
    description: "Keep the admissions calendar current so automation, urgency, and campaign timing stay aligned.",
    guidance: "If cycle data is wrong, every follow-up sequence becomes noisy.",
  },
  commission_rules: {
    eyebrow: "Payouts",
    description: "Document payout logic so finance, operations, and counselor expectations stay in sync.",
    guidance: "A clear rule summary prevents disputes once seat locks and confirmations start appearing.",
  },
  whatsapp_settings: {
    eyebrow: "Messaging",
    description: "Tune rate limits, business hours, and sandbox posture before moving from pilot to live traffic.",
    guidance: "These settings protect trust and keep the system commercially disciplined.",
  },
  review_and_publish: {
    eyebrow: "Launch",
    description: "Review the setup state, resolve blockers, and publish only when the operating model is stable.",
    guidance: "Publishing should feel deliberate, not rushed.",
  },
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getNextAcademicYear(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      return `${start + 1}-${String((end + 1) % 100).padStart(2, "0")}`;
    }
  }
  const yearMatch = value.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    if (Number.isFinite(year)) {
      return `${year + 1}`;
    }
  }
  return "2027-28";
}

export function SetupWizard({ snapshot }: SetupWizardProps) {
  const router = useRouter();
  const initialStepIndex = Math.max(
    0,
    snapshot.steps.findIndex((step) => !step.completed),
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex === -1 ? 0 : initialStepIndex);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SetupWizardStepKey[]>(
    snapshot.steps.filter((step) => step.completed).map((step) => step.key),
  );
  const [seasonYear, setSeasonYear] = useState(
    getNextAcademicYear(snapshot.admission_cycles[0]?.academic_year ?? "2026-27"),
  );
  const [seasonCopyFees, setSeasonCopyFees] = useState(true);
  const [seasonArchiveFees, setSeasonArchiveFees] = useState(true);
  const [seasonResult, setSeasonResult] = useState<string | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [feeImportFile, setFeeImportFile] = useState<File | null>(null);
  const [feeImportPreview, setFeeImportPreview] = useState<{
    total_rows: number;
    valid_rows: number;
    error_rows: number;
    errors?: Array<{ row: number; error: string }>;
  } | null>(null);
  const [feeImportResult, setFeeImportResult] = useState<string | null>(null);
  const [feeImportError, setFeeImportError] = useState<string | null>(null);
  const [feeImportLoading, setFeeImportLoading] = useState(false);
  const [feeImportAcademicYear, setFeeImportAcademicYear] = useState(seasonYear);
  const [feeImportArchive, setFeeImportArchive] = useState(true);
  const [draftState, setDraftState] = useState<Record<SetupWizardStepKey, Record<string, unknown>>>(() => ({
    organization_profile: {
      public_name: snapshot.organization?.public_name ?? "",
      legal_name: snapshot.organization?.legal_name ?? "",
      primary_contact_name: snapshot.organization?.primary_contact_name ?? "",
      primary_contact_phone: snapshot.organization?.primary_contact_phone ?? "",
    },
    institution_details: {
      name: stringValue(snapshot.institutions[0]?.["name"]),
      institution_type: stringValue(snapshot.institutions[0]?.["institution_type"]),
      board_or_university: stringValue(snapshot.institutions[0]?.["board_or_university"]),
      admissions_phone: stringValue(snapshot.institutions[0]?.["admissions_phone"] ?? snapshot.institutions[0]?.["contact_phone"]),
      admissions_email: stringValue(snapshot.institutions[0]?.["admissions_email"] ?? snapshot.institutions[0]?.["contact_email"]),
    },
    branch_details: {
      branch_name: stringValue(snapshot.branches[0]?.["name"]),
      address: stringValue(snapshot.branches[0]?.["address"]),
      contact_phone: stringValue(snapshot.branches[0]?.["contact_phone"]),
      city: stringValue(snapshot.branches[0]?.["city"]),
      district: stringValue(snapshot.branches[0]?.["district"]),
    },
    programs_and_intake: {
      active_programs: snapshot.programs.length,
      first_program: snapshot.programs[0]?.course_name ?? "",
      seats_available: snapshot.programs[0]?.seats_available ?? 0,
      intake_total: snapshot.programs[0]?.intake_total ?? 0,
    },
    fees: {
      tuition_fee: snapshot.fee_structures.find((fee) => fee.fee_type === "tuition")?.amount ?? 0,
      seat_lock: snapshot.communication_settings?.default_seat_lock_amount ?? 1000,
      fee_count: snapshot.fee_structures.length,
    },
    eligibility_and_documents: {
      required_documents: snapshot.required_documents.length,
      sample_documents: snapshot.required_documents.slice(0, 3).map((doc) => doc.document_name).join(", "),
    },
    trust_assets: {
      trust_asset_count: snapshot.trust_assets.length,
      trust_assets_summary: snapshot.trust_assets.slice(0, 3).map((asset) => asset.title).join(", "),
    },
    admission_cycle: {
      admissions_open: snapshot.admission_cycles[0]?.admissions_open ?? false,
      academic_year: snapshot.admission_cycles[0]?.academic_year ?? "2026-27",
      application_end_date: snapshot.admission_cycles[0]?.application_end_date ?? "",
    },
    commission_rules: {
      commission_rule_count: snapshot.institutions.length,
      rule_summary: "Narayana Rs 5,000 / Sri Chaitanya Rs 5,000 / Dhanik Bharat Rs 15,000",
    },
    whatsapp_settings: {
      sandbox_mode: snapshot.communication_settings?.sandbox_mode ?? true,
      business_hours_start: snapshot.communication_settings?.business_hours_start ?? "09:00",
      business_hours_end: snapshot.communication_settings?.business_hours_end ?? "20:00",
      rate_limit_per_minute: snapshot.communication_settings?.rate_limit_per_minute ?? 30,
      seat_lock_enabled: snapshot.communication_settings?.seat_lock_enabled ?? true,
    },
    review_and_publish: {},
  }));

  const currentStep = snapshot.steps[currentStepIndex];
  const currentMeta = currentStep ? stepMeta[currentStep.key] : null;

  const checklistItems = useMemo(
    () => [
      {
        label: "Organization profile",
        done: Boolean(snapshot.organization?.public_name && snapshot.organization?.primary_contact_name),
        helper: "Public name and owner contact are set.",
      },
      {
        label: "Institution contacts",
        done: Boolean(
          snapshot.institutions[0]?.name &&
            (snapshot.institutions[0]?.admissions_phone ?? snapshot.institutions[0]?.contact_phone),
        ),
        helper: "Admissions phone is available.",
      },
      {
        label: "Branches",
        done: snapshot.branches.length > 0,
        helper: `${snapshot.branches.length} branch records connected.`,
      },
      {
        label: "Programs active",
        done: snapshot.programs.some((program) => program.active_for_cycle),
        helper: `${snapshot.programs.filter((program) => program.active_for_cycle).length} active programs.`,
      },
      {
        label: "Fee structure",
        done: snapshot.fee_structures.length > 0,
        helper: `${snapshot.fee_structures.length} fee rows configured.`,
      },
      {
        label: "Admission cycle",
        done: Boolean(snapshot.admission_cycles[0]?.academic_year),
        helper: snapshot.admission_cycles[0]?.academic_year ?? "No active academic year.",
      },
      {
        label: "Trust assets",
        done: snapshot.trust_assets.length >= minimumTrustAssetCount,
        helper: `${snapshot.trust_assets.length} trust assets.`,
      },
      {
        label: "WhatsApp controls",
        done: Boolean(snapshot.communication_settings?.whatsapp_enabled || snapshot.communication_settings?.sandbox_mode),
        helper: snapshot.communication_settings?.sandbox_mode ? "Sandbox mode active." : "Messaging enabled.",
      },
    ],
    [snapshot],
  );

  async function runSeasonRefresh() {
    setSeasonLoading(true);
    setSeasonResult(null);
    setError(null);
    try {
      const response = await fetch("/api/system/season-refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          institutionId: snapshot.institutions[0]?.id ?? null,
          academicYear: seasonYear,
          copyFees: seasonCopyFees,
          archivePreviousFees: seasonArchiveFees,
        }),
      });

      const data = (await response.json()) as { error?: string; copied_fees?: number };
      if (!response.ok) {
        setSeasonResult(data.error ?? "Season refresh failed.");
      } else {
        setSeasonResult(`Season ${seasonYear} created. Copied fees: ${data.copied_fees ?? 0}.`);
      }
      router.refresh();
    } catch (err) {
      setSeasonResult(err instanceof Error ? err.message : "Season refresh failed.");
    } finally {
      setSeasonLoading(false);
    }
  }

  function downloadFeeTemplate() {
    const header =
      "branch_code,program_code,academic_year,fee_type,amount,frequency,is_current,installment_available,installment_notes,scholarship_notes,refund_policy\n";
    const sample =
      "NAR-KPHB,MPC,2027-28,tuition,120000,yearly,true,false,,\"Scholarship for top scorers\",\"\"\n";
    const blob = new Blob([header, sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fee-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function runFeeImport(mode: "preview" | "commit") {
    if (!feeImportFile) {
      setFeeImportError("Choose a fee file first.");
      return;
    }
    setFeeImportLoading(true);
    setFeeImportError(null);
    setFeeImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", feeImportFile);
      formData.append("mode", mode);
      formData.append("academicYear", feeImportAcademicYear);
      formData.append("archiveExisting", String(feeImportArchive));

      const response = await fetch("/api/system/fee-import", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        total_rows?: number;
        valid_rows?: number;
        error_rows?: number;
        errors?: Array<{ row: number; error: string }>;
        inserted_rows?: number;
      };

      if (!response.ok) {
        setFeeImportError(data.error ?? "Fee import failed.");
        setFeeImportPreview(data ? { total_rows: data.total_rows ?? 0, valid_rows: data.valid_rows ?? 0, error_rows: data.error_rows ?? 0, errors: data.errors } : null);
      } else if (mode === "preview") {
        setFeeImportPreview({
          total_rows: data.total_rows ?? 0,
          valid_rows: data.valid_rows ?? 0,
          error_rows: data.error_rows ?? 0,
          errors: data.errors,
        });
      } else {
        setFeeImportResult(`Imported ${data.inserted_rows ?? 0} fee rows.`);
        setFeeImportPreview(null);
        router.refresh();
      }
    } catch (err) {
      setFeeImportError(err instanceof Error ? err.message : "Fee import failed.");
    } finally {
      setFeeImportLoading(false);
    }
  }

  function updateStepField(stepKey: SetupWizardStepKey, field: string, value: unknown) {
    setDraftState((current) => ({
      ...current,
      [stepKey]: {
        ...current[stepKey],
        [field]: value,
      },
    }));
  }

  async function saveCurrentStep(markComplete: boolean) {
    if (!currentStep) return;

    setSaving(true);
    setError(null);

    const nextCompleted = markComplete
      ? Array.from(new Set([...completedSteps, currentStep.key]))
      : completedSteps;

    const response = await fetch("/api/setup-wizard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: snapshot.organization?.id ?? null,
        institutionId: snapshot.institutions[0]?.["id"] ?? null,
        stepKey: currentStep.key,
        draftPayload: draftState[currentStep.key],
        completedSteps: nextCompleted,
      }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Unable to save the current step.");
      setSaving(false);
      return;
    }

    setCompletedSteps(nextCompleted);
    setSaving(false);

    if (markComplete && currentStepIndex < snapshot.steps.length - 1) {
      setCurrentStepIndex((index) => index + 1);
    }

    router.refresh();
  }

  async function publishSetup() {
    setSaving(true);
    setError(null);

    const response = await fetch("/api/setup-wizard", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: snapshot.organization?.id ?? null,
        institutionId: snapshot.institutions[0]?.["id"] ?? null,
        completedSteps,
      }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Unable to publish setup.");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  const progress = useMemo(
    () => Math.round((completedSteps.length / snapshot.steps.length) * 100),
    [completedSteps.length, snapshot.steps.length],
  );

  function renderStepContent() {
    switch (currentStep?.key) {
      case "organization_profile":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Public name</span>
              <input
                value={stringValue(draftState.organization_profile.public_name)}
                onChange={(event) => updateStepField("organization_profile", "public_name", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Legal name</span>
              <input
                value={stringValue(draftState.organization_profile.legal_name)}
                onChange={(event) => updateStepField("organization_profile", "legal_name", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Primary contact</span>
              <input
                value={stringValue(draftState.organization_profile.primary_contact_name)}
                onChange={(event) => updateStepField("organization_profile", "primary_contact_name", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Primary phone</span>
              <input
                value={stringValue(draftState.organization_profile.primary_contact_phone)}
                onChange={(event) => updateStepField("organization_profile", "primary_contact_phone", event.target.value)}
                className="dashboard-input"
              />
            </label>
          </div>
        );

      case "institution_details":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Institution name</span>
              <input
                value={stringValue(draftState.institution_details.name)}
                onChange={(event) => updateStepField("institution_details", "name", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Institution type</span>
              <input
                value={stringValue(draftState.institution_details.institution_type)}
                onChange={(event) => updateStepField("institution_details", "institution_type", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Board or university</span>
              <input
                value={stringValue(draftState.institution_details.board_or_university)}
                onChange={(event) => updateStepField("institution_details", "board_or_university", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Admissions phone</span>
              <input
                value={stringValue(draftState.institution_details.admissions_phone)}
                onChange={(event) => updateStepField("institution_details", "admissions_phone", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-slate-600">Admissions email</span>
              <input
                value={stringValue(draftState.institution_details.admissions_email)}
                onChange={(event) => updateStepField("institution_details", "admissions_email", event.target.value)}
                className="dashboard-input"
              />
            </label>
          </div>
        );

      case "branch_details":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Branch name</span>
              <input
                value={stringValue(draftState.branch_details.branch_name)}
                onChange={(event) => updateStepField("branch_details", "branch_name", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Contact phone</span>
              <input
                value={stringValue(draftState.branch_details.contact_phone)}
                onChange={(event) => updateStepField("branch_details", "contact_phone", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">City</span>
              <input
                value={stringValue(draftState.branch_details.city)}
                onChange={(event) => updateStepField("branch_details", "city", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">District</span>
              <input
                value={stringValue(draftState.branch_details.district)}
                onChange={(event) => updateStepField("branch_details", "district", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-slate-600">Address</span>
              <textarea
                rows={4}
                value={stringValue(draftState.branch_details.address)}
                onChange={(event) => updateStepField("branch_details", "address", event.target.value)}
                className="dashboard-textarea"
              />
            </label>
          </div>
        );

      case "programs_and_intake":
        return (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
              <div className="font-medium text-slate-950">Catalog focus</div>
              <div className="mt-2 leading-6 text-slate-600">Supported v1 categories: Intermediate, BTech, Degree</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-slate-600">First active program</span>
                <input
                  value={stringValue(draftState.programs_and_intake.first_program)}
                  onChange={(event) => updateStepField("programs_and_intake", "first_program", event.target.value)}
                  className="dashboard-input"
                />
              </label>
              <label className="space-y-2">
                <span className="text-slate-600">Seats available</span>
                <input
                  type="number"
                  value={numberValue(draftState.programs_and_intake.seats_available)}
                  onChange={(event) => updateStepField("programs_and_intake", "seats_available", Number(event.target.value))}
                  className="dashboard-input"
                />
              </label>
              <label className="space-y-2">
                <span className="text-slate-600">Total intake</span>
                <input
                  type="number"
                  value={numberValue(draftState.programs_and_intake.intake_total)}
                  onChange={(event) => updateStepField("programs_and_intake", "intake_total", Number(event.target.value))}
                  className="dashboard-input"
                />
              </label>
              <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
                <div className="font-medium text-slate-950">Active programs</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  {numberValue(draftState.programs_and_intake.active_programs)}
                </div>
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
              <div className="font-medium text-slate-950">Supported catalog</div>
              <div className="mt-2 leading-6 text-slate-600">
                Intermediate: {supportedPrograms.intermediate.join(", ")} | BTech: {supportedPrograms.btech.join(", ")} | Degree:{" "}
                {supportedPrograms.degree.join(", ")}
              </div>
            </div>
          </div>
        );

      case "fees":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Tuition fee</span>
              <input
                type="number"
                value={numberValue(draftState.fees.tuition_fee)}
                onChange={(event) => updateStepField("fees", "tuition_fee", Number(event.target.value))}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Seat-lock amount</span>
              <input
                type="number"
                value={numberValue(draftState.fees.seat_lock, 1000)}
                onChange={(event) => updateStepField("fees", "seat_lock", Number(event.target.value))}
                className="dashboard-input"
              />
            </label>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
              <div className="font-medium text-slate-950">Fee rows configured</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{snapshot.fee_structures.length}</div>
            </div>
          </div>
        );

      case "eligibility_and_documents":
        return (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
              <div className="font-medium text-slate-950">Required documents configured</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{snapshot.required_documents.length}</div>
            </div>
            <label className="space-y-2">
              <span className="text-slate-600">Document checklist summary</span>
              <textarea
                rows={4}
                value={stringValue(draftState.eligibility_and_documents.sample_documents)}
                onChange={(event) => updateStepField("eligibility_and_documents", "sample_documents", event.target.value)}
                className="dashboard-textarea"
              />
            </label>
          </div>
        );

      case "trust_assets":
        return (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
              <div className="font-medium text-slate-950">Trust assets available</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{snapshot.trust_assets.length}</div>
            </div>
            <label className="space-y-2">
              <span className="text-slate-600">Trust asset and FAQ summary</span>
              <textarea
                rows={4}
                value={stringValue(draftState.trust_assets.trust_assets_summary)}
                onChange={(event) => updateStepField("trust_assets", "trust_assets_summary", event.target.value)}
                className="dashboard-textarea"
              />
            </label>
          </div>
        );

      case "admission_cycle":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Academic year</span>
              <input
                value={stringValue(draftState.admission_cycle.academic_year)}
                onChange={(event) => updateStepField("admission_cycle", "academic_year", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Application end date</span>
              <input
                type="date"
                value={stringValue(draftState.admission_cycle.application_end_date)}
                onChange={(event) => updateStepField("admission_cycle", "application_end_date", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="dashboard-checkbox-row md:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(draftState.admission_cycle.admissions_open)}
                onChange={(event) => updateStepField("admission_cycle", "admissions_open", event.target.checked)}
              />
              Admissions open
            </label>
          </div>
        );

      case "commission_rules":
        return (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
              <div className="font-medium text-slate-950">Rule coverage</div>
              <div className="mt-2 leading-6 text-slate-600">
                Keep payout logic easy to audit across institutions, counselor teams, and finance workflows.
              </div>
            </div>
            <label className="space-y-2">
              <span className="text-slate-600">Rule summary</span>
              <textarea
                rows={4}
                value={stringValue(draftState.commission_rules.rule_summary)}
                onChange={(event) => updateStepField("commission_rules", "rule_summary", event.target.value)}
                className="dashboard-textarea"
              />
            </label>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4 text-slate-600">
              Example structure: Narayana Rs 5,000 / Sri Chaitanya Rs 5,000 / Dhanik Bharat Rs 15,000
            </div>
          </div>
        );

      case "whatsapp_settings":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="dashboard-checkbox-row md:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(draftState.whatsapp_settings.sandbox_mode)}
                onChange={(event) => updateStepField("whatsapp_settings", "sandbox_mode", event.target.checked)}
              />
              Sandbox mode
            </label>
            <label className="dashboard-checkbox-row md:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(draftState.whatsapp_settings.seat_lock_enabled)}
                onChange={(event) => updateStepField("whatsapp_settings", "seat_lock_enabled", event.target.checked)}
              />
              Seat-lock messaging enabled
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Rate limit per minute</span>
              <input
                type="number"
                value={numberValue(draftState.whatsapp_settings.rate_limit_per_minute, 30)}
                onChange={(event) => updateStepField("whatsapp_settings", "rate_limit_per_minute", Number(event.target.value))}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Business hours start</span>
              <input
                value={stringValue(draftState.whatsapp_settings.business_hours_start)}
                onChange={(event) => updateStepField("whatsapp_settings", "business_hours_start", event.target.value)}
                className="dashboard-input"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600">Business hours end</span>
              <input
                value={stringValue(draftState.whatsapp_settings.business_hours_end)}
                onChange={(event) => updateStepField("whatsapp_settings", "business_hours_end", event.target.value)}
                className="dashboard-input"
              />
            </label>
          </div>
        );

      case "review_and_publish":
        return (
          <div className="space-y-4">
            <div
              className={`rounded-[1.25rem] border p-4 text-sm ${
                snapshot.publish_ready ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {snapshot.publish_ready
                ? "Setup is ready to publish."
                : "Publishing is blocked until the required setup data is complete."}
            </div>
            {snapshot.blockers.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-700">
                {snapshot.blockers.map((blocker) => (
                  <li key={blocker} className="rounded-[1.15rem] border border-white/70 bg-white/72 px-4 py-3">
                    {blocker}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-white/60 bg-[linear-gradient(180deg,rgba(255,253,249,0.92),rgba(255,248,240,0.72))]">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="info">Setup actions</Badge>
            <Badge variant="neutral">Self-serve onboarding</Badge>
          </div>
          <CardTitle className="mt-2 text-[1.9rem] tracking-[-0.06em] text-slate-950">
            Actionable setup checklist and seasonal refresh tools.
          </CardTitle>
          <CardDescription className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Keep every college or consultancy consistent: confirm the fundamentals, refresh each season, and bulk load fee sheets without waiting on support.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <ListChecks className="h-4 w-4 text-teal-700" />
              Checklist
            </div>
            <div className="grid gap-3">
              {checklistItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-4 rounded-[1.25rem] border border-white/70 bg-white/72 px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium text-slate-900">{item.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.helper}</div>
                  </div>
                  <div
                    className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                      item.done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {item.done ? <CheckCircle2 className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <CalendarClock className="h-4 w-4 text-amber-700" />
                Season refresh
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Create the next academic year and optionally copy the current fee grid.
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Academic year</span>
                  <input
                    value={seasonYear}
                    onChange={(event) => setSeasonYear(event.target.value)}
                    className="dashboard-input"
                  />
                </label>
                <label className="dashboard-checkbox-row md:col-span-2">
                  <input
                    type="checkbox"
                    checked={seasonCopyFees}
                    onChange={(event) => setSeasonCopyFees(event.target.checked)}
                  />
                  Copy current fee structure into the new season
                </label>
                <label className="dashboard-checkbox-row md:col-span-2">
                  <input
                    type="checkbox"
                    checked={seasonArchiveFees}
                    onChange={(event) => setSeasonArchiveFees(event.target.checked)}
                  />
                  Archive previous fees as not current
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={runSeasonRefresh} disabled={seasonLoading}>
                  {seasonLoading ? "Refreshing..." : "Run season refresh"}
                </Button>
                {seasonResult ? <div className="text-sm text-slate-600">{seasonResult}</div> : null}
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <UploadCloud className="h-4 w-4 text-teal-700" />
                Bulk fee import
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Upload a CSV, XLS, or XLSX fee sheet for faster onboarding.
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Academic year</span>
                  <input
                    value={feeImportAcademicYear}
                    onChange={(event) => setFeeImportAcademicYear(event.target.value)}
                    className="dashboard-input"
                  />
                </label>
                <label className="dashboard-checkbox-row md:col-span-2">
                  <input
                    type="checkbox"
                    checked={feeImportArchive}
                    onChange={(event) => setFeeImportArchive(event.target.checked)}
                  />
                  Archive previous fees when importing
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-600">Fee file</span>
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={(event) => setFeeImportFile(event.target.files?.[0] ?? null)}
                    className="dashboard-input file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={downloadFeeTemplate}>
                  Download template
                </Button>
                <Button type="button" onClick={() => runFeeImport("preview")} disabled={feeImportLoading}>
                  {feeImportLoading ? "Checking..." : "Preview import"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => runFeeImport("commit")} disabled={feeImportLoading}>
                  {feeImportLoading ? "Importing..." : "Import fees"}
                </Button>
              </div>
              {feeImportPreview ? (
                <div className="mt-4 rounded-[1.15rem] border border-white/70 bg-white/78 px-4 py-3 text-sm text-slate-700">
                  Preview: {feeImportPreview.valid_rows}/{feeImportPreview.total_rows} rows valid,{" "}
                  {feeImportPreview.error_rows} errors.
                </div>
              ) : null}
              {feeImportError ? (
                <div className="mt-3 rounded-[1.15rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {feeImportError}
                </div>
              ) : null}
              {feeImportResult ? <div className="mt-3 text-sm text-slate-600">{feeImportResult}</div> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
      <Card className="h-fit overflow-hidden xl:sticky xl:top-24">
        <div className="border-b border-white/60 bg-[linear-gradient(135deg,rgba(11,27,40,0.98),rgba(19,53,69,0.92)_58%,rgba(18,83,86,0.8))]">
          <CardHeader className="space-y-4 text-white">
            <Badge variant="accent">Setup progress</Badge>
            <div>
              <CardTitle className="text-[1.9rem] tracking-[-0.06em] text-white">{progress}% complete</CardTitle>
              <CardDescription className="mt-2 text-slate-300">
                Build the operating model with the same polish and discipline you expect from the live product.
              </CardDescription>
            </div>
          </CardHeader>
        </div>

        <CardContent className="space-y-5 pt-6">
          <div className="rounded-[1.35rem] border border-white/70 bg-white/72 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Completed</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  {completedSteps.length}/{snapshot.steps.length}
                </div>
              </div>
              <div className="rounded-full border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                {snapshot.publish_ready ? "Ready" : "In progress"}
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-200/80">
              <div className="h-2 rounded-full bg-[linear-gradient(90deg,#0f766e,#b38443)]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="space-y-3">
            {snapshot.steps.map((step, index) => {
              const isActive = currentStep?.key === step.key;
              const isDone = completedSteps.includes(step.key);

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setCurrentStepIndex(index)}
                  className={`flex w-full items-start justify-between gap-4 rounded-[1.25rem] border px-4 py-4 text-left transition-all ${
                    isActive
                      ? "border-[rgba(15,118,110,0.28)] bg-[rgba(15,118,110,0.08)] shadow-[0_16px_36px_rgba(15,118,110,0.08)]"
                      : "border-white/70 bg-white/72 hover:border-[rgba(179,132,67,0.28)] hover:bg-[rgba(255,252,247,0.92)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border ${
                        isDone
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : isActive
                            ? "border-[rgba(15,118,110,0.24)] bg-[rgba(15,118,110,0.12)] text-teal-700"
                            : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-slate-950">{step.label}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{stepMeta[step.key].eyebrow}</div>
                    </div>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {isDone ? "Done" : step.required ? "Required" : "Optional"}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-[1.35rem] border border-[rgba(17,32,49,0.14)] bg-[linear-gradient(135deg,#112031,#1f3a4d)] p-4 text-sm text-slate-200">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-300">
              <ShieldCheck className="h-4 w-4 text-[#f0d59c]" />
              Publishing discipline
            </div>
            <div className="mt-3 leading-6">
              Use this as an operations readiness checklist, not just a data form. The cleaner the setup, the stronger the live funnel.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-white/60 bg-[linear-gradient(180deg,rgba(255,253,249,0.92),rgba(255,248,240,0.72))]">
          <CardHeader className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="info">Step {currentStepIndex + 1}</Badge>
              <Badge variant={currentStep?.required ? "accent" : "neutral"}>{currentStep?.required ? "Required" : "Optional"}</Badge>
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.15fr,0.85fr]">
              <div>
                <CardDescription>{currentMeta?.eyebrow ?? "Setup"}</CardDescription>
                <CardTitle className="mt-2 text-[2rem] tracking-[-0.06em] text-slate-950">{currentStep?.label ?? "Setup step"}</CardTitle>
                <div className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{currentMeta?.description}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[1.25rem] border border-white/70 bg-white/78 p-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Guidance</div>
                  <div className="mt-2 text-sm leading-6 text-slate-700">{currentMeta?.guidance}</div>
                </div>
                <div className="rounded-[1.25rem] border border-white/70 bg-white/78 p-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Publish state</div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-950">
                    <Sparkles className="h-4 w-4 text-teal-700" />
                    {snapshot.publish_ready ? "Ready when you are" : "Blockers still active"}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </div>

        <CardContent className="space-y-6 pt-6">
          {renderStepContent()}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="button" onClick={() => saveCurrentStep(true)} disabled={saving} className="min-w-[170px]">
              {saving ? "Saving..." : "Save and continue"}
            </Button>
            <Button type="button" variant="outline" onClick={() => saveCurrentStep(false)} disabled={saving}>
              Save draft
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCurrentStepIndex((index) => Math.min(index + 1, snapshot.steps.length - 1))}
              disabled={saving}
            >
              Skip for now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {currentStep?.key === "review_and_publish" ? (
              <Button type="button" variant="secondary" disabled={saving || !snapshot.publish_ready} onClick={publishSetup}>
                Publish setup
              </Button>
            ) : null}
          </div>

          {error ? <div className="rounded-[1.15rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
