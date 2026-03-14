import Link from "next/link";
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
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <Card>
            <CardHeader>
              <CardDescription>Online admission flow</CardDescription>
              <CardTitle>{getLeadDisplayName(workflow.lead.student_name, workflow.lead.parent_name)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <LeadStageBadge stage={workflow.lead.stage} />
                <LeadStatusBadge status={workflow.lead.status} />
              </div>
              <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-600">
                <div>
                  <div className="text-slate-500">Branch</div>
                  <div className="font-medium text-slate-950">{selectedBranch.name}</div>
                </div>
                <div>
                  <div className="text-slate-500">Parent phone</div>
                  <div className="font-medium text-slate-950">{workflow.lead.parent_phone ?? "Not captured"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Course</div>
                  <div className="font-medium text-slate-950">{workflow.lead.course_interest ?? "Not captured"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Hostel</div>
                  <div className="font-medium text-slate-950">{workflow.lead.hostel_required ? "Required" : "Not required"}</div>
                </div>
              </div>

              {isSeatLocked ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="text-sm font-medium text-emerald-800">Seat lock confirmed</div>
                  <div className="mt-2 text-sm text-emerald-700">
                    Payment is already confirmed. The admissions team can continue with document and branch follow-up.
                  </div>
                </div>
              ) : pendingPayment ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <div className="text-sm font-medium text-amber-900">Form already submitted</div>
                  <div className="mt-2 text-sm text-amber-800">
                    Continue with the existing seat-lock payment instead of creating a duplicate.
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
                <CardDescription>Selected branch</CardDescription>
                <CardTitle>{selectedBranch.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div>{selectedBranch.city}, {selectedBranch.district}</div>
                <div>{selectedBranch.address}</div>
                <div>{selectedBranch.capacity_available} seats available right now</div>
                <div>{selectedBranch.hostel_available ? "Hostel available" : "Day scholar flow"}</div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-slate-500">Tuition snapshot</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {selectedBranch.latest_fee_snapshot?.tuition_fee
                      ? formatCurrency(selectedBranch.latest_fee_snapshot.tuition_fee)
                      : "Shared on counselor call"}
                  </div>
                </div>
                <Link href={`/branches/${selectedBranch.code}?leadId=${workflow.lead.id}`} className={buttonVariants({ variant: "outline" })}>
                  Re-open branch detail page
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Seat lock</CardDescription>
                <CardTitle>{formatCurrency(seatLockAmount)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div>Payment status: {humanizeToken(workflow.lead.payment_status ?? "not_created")}</div>
                <div>Form status: {humanizeToken(workflow.form?.submission_status ?? "not_started")}</div>
                <div>
                  {communicationSettings.seat_lock_enabled
                    ? "Seat-lock is enabled for this organization. Use the official payment step generated after form submission."
                    : "Seat-lock is currently disabled in organization settings."}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="font-medium text-slate-950">Payment terms</div>
                  <div className="mt-2">{communicationSettings.payment_terms_text}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="font-medium text-slate-950">Refund policy</div>
                  <div className="mt-2">{communicationSettings.refund_policy_text}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
