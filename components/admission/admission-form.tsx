"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type AdmissionFormProps = {
  leadId: string;
  branchId: string;
  defaults: {
    studentName: string;
    fatherName: string;
    motherName: string;
    parentPhone: string;
    studentPhone: string;
    address: string;
    district: string;
    courseSelected: string;
    hostelRequired: boolean;
    marks10th: string;
  };
};

export function AdmissionForm({ leadId, branchId, defaults }: AdmissionFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState(defaults);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof typeof defaults, value: string | boolean) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/admission/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leadId,
        branchId,
        studentName: formState.studentName,
        fatherName: formState.fatherName,
        motherName: formState.motherName,
        parentPhone: formState.parentPhone,
        studentPhone: formState.studentPhone,
        address: formState.address,
        district: formState.district,
        courseSelected: formState.courseSelected,
        hostelRequired: formState.hostelRequired,
        marks10th: formState.marks10th ? Number(formState.marks10th) : null,
      }),
    });

    const data = (await response.json()) as { error?: string; checkout_url?: string };

    if (!response.ok || !data.checkout_url) {
      setError(data.error ?? "Unable to submit the admission form.");
      setIsSubmitting(false);
      return;
    }

    router.push(data.checkout_url);
    router.refresh();
  };

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <div className="rounded-[1.4rem] border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.06)] p-4 text-sm leading-6 text-slate-700">
        Complete the profile carefully. The next step generates the official seat-lock payment flow for this branch.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="text-slate-600">Student name</span>
          <input
            required
            value={formState.studentName}
            onChange={(event) => updateField("studentName", event.target.value)}
            className="dashboard-input"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-600">Parent phone</span>
          <input
            required
            value={formState.parentPhone}
            onChange={(event) => updateField("parentPhone", event.target.value)}
            className="dashboard-input"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-600">Father name</span>
          <input
            value={formState.fatherName}
            onChange={(event) => updateField("fatherName", event.target.value)}
            className="dashboard-input"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-600">Mother name</span>
          <input
            value={formState.motherName}
            onChange={(event) => updateField("motherName", event.target.value)}
            className="dashboard-input"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-600">Student phone</span>
          <input
            value={formState.studentPhone}
            onChange={(event) => updateField("studentPhone", event.target.value)}
            className="dashboard-input"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-600">10th marks / GPA</span>
          <input
            inputMode="decimal"
            value={formState.marks10th}
            onChange={(event) => updateField("marks10th", event.target.value)}
            className="dashboard-input"
          />
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span className="text-slate-600">Address</span>
        <textarea
          required
          rows={4}
          value={formState.address}
          onChange={(event) => updateField("address", event.target.value)}
          className="dashboard-textarea"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm">
          <span className="text-slate-600">District</span>
          <input
            required
            value={formState.district}
            onChange={(event) => updateField("district", event.target.value)}
            className="dashboard-input"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-600">Course</span>
          <select
            value={formState.courseSelected}
            onChange={(event) => updateField("courseSelected", event.target.value)}
            className="dashboard-input"
          >
            <option value="MPC">MPC</option>
            <option value="BiPC">BiPC</option>
            <option value="MEC">MEC</option>
            <option value="CEC">CEC</option>
          </select>
        </label>
        <label className="dashboard-checkbox-row">
          <input
            type="checkbox"
            checked={formState.hostelRequired}
            onChange={(event) => updateField("hostelRequired", event.target.checked)}
          />
          Hostel required
        </label>
      </div>

      {error ? (
        <div className="rounded-[1.15rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit form and continue to seat lock"}
        </Button>
        <div className="text-sm text-slate-500">The next step generates the official seat-lock payment link.</div>
      </div>
    </form>
  );
}
