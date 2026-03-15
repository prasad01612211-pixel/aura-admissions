import Link from "next/link";
import { FileCheck2, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { notFound } from "next/navigation";

import { AdmissionForm } from "@/components/admission/admission-form";
import { LeadStageBadge, LeadStatusBadge } from "@/components/dashboard/state-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadWorkflowSnapshot } from "@/lib/admission/service";
import { getActiveBranchProfiles, getBranchByIdentifier } from "@/lib/data/branches";
import { getRecommendationScopeMode, recommendBranches } from "@/lib/branch-matching/recommend";
import { getCommunicationSettings } from "@/lib/operations/settings";
import { formatCurrency, getLeadDisplayName, humanizeToken } from "@/lib/utils";

type PageProps = {
  params: Promise<{ leadId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdmissionPage({ params, searchParams }: PageProps) {
  const { leadId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const workflow = await getLeadWorkflowSnapshot(leadId);

  if (!workflow) {
    notFound();
  }

  const availableBranches = await getActiveBranchProfiles();
  const requestedBranch = getSingleValue(resolvedSearchParams.branch);
  const selectedBranch =
    (requestedBranch ? await getBranchByIdentifier(requestedBranch) : null) ??
    availableBranches.find((branch) => branch.id === workflow.lead.assigned_branch_id || branch.id === workflow.lead.preferred_branch_id) ??
    availableBranches.find(
      (branch) =>
        branch.id ===
        recommendBranches(
          {
            pincode: workflow.lead.pincode,
            district: workflow.lead.district,
            city: workflow.lead.city,
            locality: workflow.lead.area ?? workflow.lead.preferred_location ?? null,
            course_interest: workflow.lead.course_interest,
            hostel_required: workflow.lead.hostel_required,
            scope_mode: getRecommendationScopeMode(),
          },
          availableBranches,
        )[0]?.branch_id,
    ) ??
    null;

  if (!selectedBranch) {
    notFound();
  }

  const communicationSettings = await getCommunicationSettings(workflow.lead.organization_id ?? undefined);
  const pendingPayment = workflow.payments.find((payment) => ["created", "pending"].includes(payment.status));
  const isSeatLocked = workflow.lead.seat_lock_paid || workflow.lead.stage === "seat_locked";
  const seatLockAmount =
    workflow.lead.seat_lock_amount ??
    selectedBranch.latest_fee_snapshot?.seat_lock_amount ??
    communicationSettings.default_seat_lock_amount;

  return (
    <main className="min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/40 bg-[linear-gradient(135deg,rgba(8,22,36,0.97),rgba(18,53,70,0.94)_56%,rgba(16,93,88,0.82))] px-6 py-8 text-white shadow-[0_28px_90px_rgba(8,24,38,0.24)] lg:px-10 lg:py-10">
          <div className="grid gap-8 xl:grid-cols-[1.08fr,0.92fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.26em] text-[#e3c78f]">
                  Online admission
                </div>
                <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-slate-200">
                  Parent-led form and seat-lock flow
                </div>
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.07em] text-white lg:text-5xl">
                {getLeadDisplayName(workflow.lead.student_name, workflow.lead.parent_name)}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-200">
                This flow is designed to keep families confident: clear branch context, a clean form, and a transparent payment step without confusion or duplicate follow-up.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <LeadStageBadge stage={workflow.lead.stage} />
                <LeadStatusBadge status={workflow.lead.status} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Selected branch</div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">{selectedBranch.name}</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  {selectedBranch.city}, {selectedBranch.district}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Seat lock</div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">{formatCurrency(seatLockAmount)}</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">Official payment step created after form submission.</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Course interest</div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">{workflow.lead.course_interest ?? "Pending"}</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">Parent preference captured from the active lead record.</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Hostel need</div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
                  {workflow.lead.hostel_required ? "Required" : "Not required"}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-300">Used to keep branch recommendations and payment context accurate.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.04fr,0.96fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-[1rem] border border-[rgba(15,118,110,0.15)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <div>
                  <CardDescription>Admission form</CardDescription>
                  <CardTitle>Student and parent details for branch intake</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSeatLocked ? (
                <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">Seat lock confirmed</div>
                  <div className="mt-3 text-sm leading-7 text-emerald-700">
                    Payment is already confirmed. The admissions team can continue with document review and branch follow-up.
                  </div>
                </div>
              ) : pendingPayment ? (
                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-900">Form already submitted</div>
                  <div className="mt-3 text-sm leading-7 text-amber-800">
                    Continue with the existing seat-lock payment instead of creating a duplicate step.
                  </div>
                  <Link href={`/payment/${pendingPayment.id}`} className={`${buttonVariants({ className: "mt-4" })}`}>
                    Open payment step
                  </Link>
                </div>
              ) : (
                <AdmissionForm
                  leadId={workflow.lead.id}
                  branchId={selectedBranch.id}
                  defaults={{
                    studentName: workflow.form?.student_name ?? workflow.lead.student_name ?? "",
                    fatherName: workflow.form?.father_name ?? workflow.lead.parent_name ?? "",
                    motherName: workflow.form?.mother_name ?? "",
                    parentPhone: workflow.form?.parent_phone ?? workflow.lead.parent_phone ?? workflow.lead.student_phone ?? "",
                    studentPhone: workflow.form?.student_phone ?? workflow.lead.student_phone ?? "",
                    address: workflow.form?.address ?? `${workflow.lead.city ?? ""}, ${workflow.lead.district ?? ""}`.trim(),
                    district: workflow.form?.district ?? workflow.lead.district ?? "",
                    courseSelected: workflow.form?.course_selected ?? workflow.lead.course_interest ?? "MPC",
                    hostelRequired: workflow.form?.hostel_required ?? workflow.lead.hostel_required,
                    marks10th: workflow.form?.marks_10th?.toString() ?? workflow.lead.marks_10th?.toString() ?? "",
                  }}
                />
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-[1rem] border border-[rgba(179,132,67,0.2)] bg-[rgba(179,132,67,0.08)] p-2 text-[rgb(120,83,34)]">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <CardDescription>Selected branch</CardDescription>
                    <CardTitle>{selectedBranch.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                <div>{selectedBranch.city}, {selectedBranch.district}</div>
                <div>{selectedBranch.address}</div>
                <div>{selectedBranch.capacity_available} seats available right now</div>
                <div>{selectedBranch.hostel_available ? "Hostel available" : "Day scholar flow"}</div>
                <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
                  <div className="text-slate-500">Tuition snapshot</div>
                  <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">
                    {selectedBranch.latest_fee_snapshot?.tuition_fee ? formatCurrency(selectedBranch.latest_fee_snapshot.tuition_fee) : "Shared on counselor call"}
                  </div>
                </div>
                <Link href={`/branches/${selectedBranch.code}?leadId=${workflow.lead.id}`} className={buttonVariants({ variant: "outline" })}>
                  Re-open branch detail page
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-[1rem] border border-[rgba(15,118,110,0.15)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <CardDescription>Seat lock</CardDescription>
                    <CardTitle>{formatCurrency(seatLockAmount)}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                <div>Payment status: {humanizeToken(workflow.lead.payment_status ?? "not_created")}</div>
                <div>Form status: {humanizeToken(workflow.form?.submission_status ?? "not_started")}</div>
                <div>
                  {communicationSettings.seat_lock_enabled
                    ? "Seat-lock is enabled for this organization. The official payment step is generated after form submission."
                    : "Seat-lock is currently disabled in organization settings."}
                </div>
                <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
                  <div className="font-medium text-slate-950">Payment terms</div>
                  <div className="mt-2 leading-6">{communicationSettings.payment_terms_text}</div>
                </div>
                <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
                  <div className="font-medium text-slate-950">Refund policy</div>
                  <div className="mt-2 leading-6">{communicationSettings.refund_policy_text}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-[1rem] border border-[rgba(15,118,110,0.15)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <CardDescription>Parent clarity</CardDescription>
                    <CardTitle>What this step is designed to prevent</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
                <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">No duplicate payment links when a family has already reached the checkout stage.</div>
                <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">No guesswork about branch, fee context, or who owns the next follow-up.</div>
                <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">No hidden jump from form to payment without explaining terms and refund policy.</div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
