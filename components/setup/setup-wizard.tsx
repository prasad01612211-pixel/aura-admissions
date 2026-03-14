"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supportedPrograms } from "@/lib/operations/catalog";
import type { SetupWizardSnapshot, SetupWizardStepKey } from "@/types/operations";

type SetupWizardProps = {
  snapshot: SetupWizardSnapshot;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
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
      rule_summary: "Narayana ₹5,000 · Sri Chaitanya ₹5,000 · Dhanik Bharat ₹15,000",
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

  return (
    <div className="grid gap-6 xl:grid-cols-[0.28fr,0.72fr]">
      <Card>
        <CardHeader>
          <CardDescription>Setup progress</CardDescription>
          <CardTitle>{progress}% complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-sky-600" style={{ width: `${progress}%` }} />
          </div>
          {snapshot.steps.map((step, index) => (
            <button
              key={step.key}
              type="button"
              onClick={() => setCurrentStepIndex(index)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm ${
                currentStep?.key === step.key ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <span>{step.label}</span>
              <span>{completedSteps.includes(step.key) ? "Done" : step.required ? "Required" : "Optional"}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardDescription>Step {currentStepIndex + 1}</CardDescription>
            <CardTitle>{currentStep?.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {currentStep?.key === "organization_profile" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Public name</span>
                  <input
                    value={stringValue(draftState.organization_profile.public_name)}
                    onChange={(event) => updateStepField("organization_profile", "public_name", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Legal name</span>
                  <input
                    value={stringValue(draftState.organization_profile.legal_name)}
                    onChange={(event) => updateStepField("organization_profile", "legal_name", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Primary contact</span>
                  <input
                    value={stringValue(draftState.organization_profile.primary_contact_name)}
                    onChange={(event) => updateStepField("organization_profile", "primary_contact_name", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Primary phone</span>
                  <input
                    value={stringValue(draftState.organization_profile.primary_contact_phone)}
                    onChange={(event) => updateStepField("organization_profile", "primary_contact_phone", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
              </div>
            ) : null}

            {currentStep?.key === "institution_details" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Institution name</span>
                  <input
                    value={stringValue(draftState.institution_details.name)}
                    onChange={(event) => updateStepField("institution_details", "name", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Institution type</span>
                  <input
                    value={stringValue(draftState.institution_details.institution_type)}
                    onChange={(event) => updateStepField("institution_details", "institution_type", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Board / university</span>
                  <input
                    value={stringValue(draftState.institution_details.board_or_university)}
                    onChange={(event) => updateStepField("institution_details", "board_or_university", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Admissions phone</span>
                  <input
                    value={stringValue(draftState.institution_details.admissions_phone)}
                    onChange={(event) => updateStepField("institution_details", "admissions_phone", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
              </div>
            ) : null}

            {currentStep?.key === "branch_details" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Branch name</span>
                  <input
                    value={stringValue(draftState.branch_details.branch_name)}
                    onChange={(event) => updateStepField("branch_details", "branch_name", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Contact phone</span>
                  <input
                    value={stringValue(draftState.branch_details.contact_phone)}
                    onChange={(event) => updateStepField("branch_details", "contact_phone", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-600">Address</span>
                  <textarea
                    rows={3}
                    value={stringValue(draftState.branch_details.address)}
                    onChange={(event) => updateStepField("branch_details", "address", event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>
              </div>
            ) : null}

            {currentStep?.key === "programs_and_intake" ? (
              <div className="space-y-4 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  Supported v1 categories: Intermediate, BTech, Degree
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-slate-600">First active program</span>
                    <input
                      value={stringValue(draftState.programs_and_intake.first_program)}
                      onChange={(event) => updateStepField("programs_and_intake", "first_program", event.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-slate-600">Seats available</span>
                    <input
                      type="number"
                      value={Number(draftState.programs_and_intake.seats_available ?? 0)}
                      onChange={(event) => updateStepField("programs_and_intake", "seats_available", Number(event.target.value))}
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                    />
                  </label>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium text-slate-950">Supported catalog</div>
                  <div className="mt-2 text-slate-600">
                    Intermediate: {supportedPrograms.intermediate.join(", ")} · BTech: {supportedPrograms.btech.join(", ")} · Degree: {supportedPrograms.degree.join(", ")}
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep?.key === "fees" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Tuition fee</span>
                  <input
                    type="number"
                    value={Number(draftState.fees.tuition_fee ?? 0)}
                    onChange={(event) => updateStepField("fees", "tuition_fee", Number(event.target.value))}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Seat-lock amount</span>
                  <input
                    type="number"
                    value={Number(draftState.fees.seat_lock ?? 1000)}
                    onChange={(event) => updateStepField("fees", "seat_lock", Number(event.target.value))}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
              </div>
            ) : null}

            {currentStep?.key === "eligibility_and_documents" ? (
              <div className="space-y-4 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium text-slate-950">Required documents configured</div>
                  <div className="mt-2">{snapshot.required_documents.length}</div>
                </div>
                <label className="space-y-2">
                  <span className="text-slate-600">Document checklist summary</span>
                  <textarea
                    rows={3}
                    value={stringValue(draftState.eligibility_and_documents.sample_documents)}
                    onChange={(event) => updateStepField("eligibility_and_documents", "sample_documents", event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>
              </div>
            ) : null}

            {currentStep?.key === "trust_assets" ? (
              <div className="space-y-4 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium text-slate-950">Trust assets available</div>
                  <div className="mt-2">{snapshot.trust_assets.length}</div>
                </div>
                <label className="space-y-2">
                  <span className="text-slate-600">Trust asset / FAQ summary</span>
                  <textarea
                    rows={3}
                    value={stringValue(draftState.trust_assets.trust_assets_summary)}
                    onChange={(event) => updateStepField("trust_assets", "trust_assets_summary", event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>
              </div>
            ) : null}

            {currentStep?.key === "admission_cycle" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Academic year</span>
                  <input
                    value={stringValue(draftState.admission_cycle.academic_year)}
                    onChange={(event) => updateStepField("admission_cycle", "academic_year", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(draftState.admission_cycle.admissions_open)}
                    onChange={(event) => updateStepField("admission_cycle", "admissions_open", event.target.checked)}
                  />
                  Admissions open
                </label>
              </div>
            ) : null}

            {currentStep?.key === "commission_rules" ? (
              <div className="space-y-4 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-200 p-4">
                  Current rule summary: {stringValue(draftState.commission_rules.rule_summary)}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  Narayana ₹5,000 · Sri Chaitanya ₹5,000 · Dhanik Bharat ₹15,000
                </div>
              </div>
            ) : null}

            {currentStep?.key === "whatsapp_settings" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(draftState.whatsapp_settings.sandbox_mode)}
                    onChange={(event) => updateStepField("whatsapp_settings", "sandbox_mode", event.target.checked)}
                  />
                  Sandbox mode
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Rate limit / minute</span>
                  <input
                    type="number"
                    value={Number(draftState.whatsapp_settings.rate_limit_per_minute ?? 30)}
                    onChange={(event) => updateStepField("whatsapp_settings", "rate_limit_per_minute", Number(event.target.value))}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Business hours start</span>
                  <input
                    value={stringValue(draftState.whatsapp_settings.business_hours_start)}
                    onChange={(event) => updateStepField("whatsapp_settings", "business_hours_start", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-600">Business hours end</span>
                  <input
                    value={stringValue(draftState.whatsapp_settings.business_hours_end)}
                    onChange={(event) => updateStepField("whatsapp_settings", "business_hours_end", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4"
                  />
                </label>
              </div>
            ) : null}

            {currentStep?.key === "review_and_publish" ? (
              <div className="space-y-4">
                <div className={`rounded-2xl border p-4 text-sm ${snapshot.publish_ready ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                  {snapshot.publish_ready ? "Setup is ready to publish." : "Publish is blocked until the required setup data is complete."}
                </div>
                {snapshot.blockers.length > 0 ? (
                  <ul className="space-y-2 text-sm text-slate-700">
                    {snapshot.blockers.map((blocker) => (
                      <li key={blocker} className="rounded-2xl border border-slate-200 px-4 py-3">
                        {blocker}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => saveCurrentStep(true)} disabled={saving}>
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
              </Button>
              {currentStep?.key === "review_and_publish" ? (
                <Button type="button" variant="secondary" disabled={saving || !snapshot.publish_ready} onClick={publishSetup}>
                  Publish setup
                </Button>
              ) : null}
            </div>

            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
