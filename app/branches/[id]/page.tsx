import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Bus, ExternalLink, GraduationCap, Home, MapPin, PhoneCall, ShieldCheck, Star } from "lucide-react";
import { notFound } from "next/navigation";

import { BranchActionPanel } from "@/components/dashboard/branch-action-panel";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureBranchViewed } from "@/lib/admission/service";
import { branchStaticParams, getBranchByIdentifier } from "@/lib/data/branches";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatInr(value: number | null | undefined, fallback: string) {
  return typeof value === "number" ? `Rs ${value.toLocaleString("en-IN")}` : fallback;
}

export async function generateStaticParams() {
  return branchStaticParams;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const branch = await getBranchByIdentifier(id);

  return {
    title: branch ? `${branch.name} | Aura Admissions` : "Branch not found",
    description: branch ? `${branch.name} branch details, trust points, and admission actions.` : "Branch not found",
  };
}

export default async function BranchPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const leadId = getSingleValue(resolvedSearchParams.leadId);
  const branch = await getBranchByIdentifier(id);

  if (!branch) {
    notFound();
  }

  const continueHref = leadId ? `/admission/${leadId}?branch=${branch.code}` : "#admission-path";
  const mapsHref = branch.google_maps_url ?? branch.maps_url ?? null;
  const primaryContact = branch.branch_contacts?.find((contact) => contact.primary_contact) ?? branch.branch_contacts?.[0] ?? null;
  const feeSnapshot = branch.latest_fee_snapshot;
  const seatAvailabilityKnown = branch.capacity_total > 0 || branch.capacity_available > 0;
  const verificationLabel =
    branch.verification_status === "verified"
      ? "Verified branch"
      : branch.verification_status === "rejected"
        ? "Verification failed"
        : "Verification pending";

  if (leadId) {
    await ensureBranchViewed({
      leadId,
      branchId: branch.id,
    });
  }

  return (
    <main className="min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/40 bg-[linear-gradient(135deg,rgba(8,22,36,0.97),rgba(18,53,70,0.94)_56%,rgba(16,93,88,0.82))] px-6 py-8 text-white shadow-[0_28px_90px_rgba(8,24,38,0.24)] lg:px-10 lg:py-10">
          <div className="grid gap-8 xl:grid-cols-[1.08fr,0.92fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.26em] text-[#e3c78f]">
                  Parent branch detail
                </div>
                <div
                  className={cn(
                    "inline-flex rounded-full border px-4 py-2 text-sm",
                    branch.verification_status === "verified"
                      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                      : "border-amber-300/30 bg-amber-400/10 text-amber-100",
                  )}
                >
                  {verificationLabel}
                </div>
              </div>

              <div>
                {branch.institution_name ? (
                  <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[#d6c396]">{branch.institution_name}</div>
                ) : null}
                <h1 className="text-4xl font-semibold tracking-[-0.07em] text-white lg:text-5xl">{branch.name}</h1>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-200">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#e3c78f]" />
                    {branch.locality ? `${branch.locality}, ` : ""}
                    {branch.city}, {branch.district}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Home className="h-4 w-4 text-[#e3c78f]" />
                    {branch.hostel_available ? "Hostel available" : "Day scholar focused"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Bus className="h-4 w-4 text-[#e3c78f]" />
                    {branch.transport_available ? "Transport supported" : "Local commute"}
                  </span>
                </div>
              </div>

              <p className="max-w-2xl text-base leading-8 text-slate-200">
                This page is built to answer the questions parents ask before they commit: where the branch is, why they should trust it, what the fee picture looks like, and what to do next.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.08] p-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">Seat lock</div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                    {formatInr(feeSnapshot?.seat_lock_amount, "Rs 1,000 default")}
                  </div>
                </div>
                <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.08] p-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">Tuition snapshot</div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                    {formatInr(feeSnapshot?.tuition_fee, "Shared on callback")}
                  </div>
                </div>
                <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.08] p-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">Admissions contact</div>
                  <div className="mt-2 text-base font-semibold text-white">{primaryContact?.phone ?? branch.contact_phone ?? "Pending verification"}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={continueHref} className={buttonVariants({ size: "lg", variant: "secondary" })}>
                  Continue online admission
                </Link>
              </div>

              <BranchActionPanel branchId={branch.id} leadId={leadId} />
              {!leadId ? (
                <div className="rounded-[1.25rem] border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  Pass a `leadId` in the branch link to continue straight into the parent admission form.
                </div>
              ) : null}
            </div>

            <Card className="overflow-hidden border-white/10 bg-[rgba(255,255,255,0.08)] text-white shadow-none backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-[1rem] border border-white/10 bg-black/15 p-2 text-[#e3c78f]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <CardDescription className="text-slate-300">Admission highlights</CardDescription>
                    <CardTitle className="text-white">Why parents choose this branch</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {typeof branch.trust_score === "number" ? (
                  <div className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100">
                    Trust score {branch.trust_score}/100
                  </div>
                ) : null}
                {branch.primary_review?.rating ? (
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-4 text-sm text-slate-200">
                    {branch.primary_review.rating.toFixed(1)} / 5 from {branch.primary_review.review_count} public ratings
                  </div>
                ) : null}
                {branch.highlights.map((highlight) => (
                  <div key={highlight} className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-slate-200">
                    {highlight}
                  </div>
                ))}
                <div className="rounded-[1.35rem] border border-sky-300/20 bg-sky-400/10 p-4 text-sm text-sky-100">
                  {seatAvailabilityKnown
                    ? `${branch.capacity_available} seats are currently available for the active intake.`
                    : "Seat availability is pending branch verification."}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.12fr,0.88fr]">
          <Card>
            <CardHeader>
              <CardDescription>Campus gallery</CardDescription>
              <CardTitle>Photos and proof points</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {branch.assets.length > 0 ? (
                branch.assets.map((asset) => (
                  <div key={asset.id} className="overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/72">
                    <div className="relative aspect-[4/3]">
                      <Image src={asset.file_url} alt={asset.title} fill className="object-cover" />
                    </div>
                    <div className="p-4 text-sm font-medium text-slate-700">{asset.title}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-500 md:col-span-2">
                  Branch photos are still pending manual verification for this campus.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardDescription>Courses offered</CardDescription>
                <CardTitle>Programs open for this intake</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {branch.courses.map((course) => (
                  <div key={course.code} className="flex items-center justify-between rounded-[1.25rem] border border-white/70 bg-white/72 p-4 text-sm">
                    <div className="inline-flex items-center gap-3">
                      <GraduationCap className="h-4 w-4 text-teal-700" />
                      <div>
                        <div className="font-medium text-slate-950">{course.name}</div>
                        <div className="text-slate-500">{course.stream}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-950">{course.seats_available > 0 ? course.seats_available : "Pending"}</div>
                      <div className="text-slate-500">{course.seats_available > 0 ? "seats open" : "verification"}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Structured fee config</CardDescription>
                <CardTitle>Fee snapshot and payment clarity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.2rem] border border-white/70 bg-white/72 p-4">
                    <div className="text-slate-500">Tuition</div>
                    <div className="mt-2 font-semibold text-slate-950">{formatInr(feeSnapshot?.tuition_fee, "To be shared")}</div>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/70 bg-white/72 p-4">
                    <div className="text-slate-500">Seat lock</div>
                    <div className="mt-2 font-semibold text-slate-950">{formatInr(feeSnapshot?.seat_lock_amount, "Rs 1,000 default")}</div>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/70 bg-white/72 p-4">
                    <div className="text-slate-500">Hostel</div>
                    <div className="mt-2 font-semibold text-slate-950">
                      {formatInr(feeSnapshot?.hostel_fee, branch.hostel_available ? "Shared on callback" : "Not applicable")}
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/70 bg-white/72 p-4">
                    <div className="text-slate-500">Transport</div>
                    <div className="mt-2 font-semibold text-slate-950">
                      {formatInr(feeSnapshot?.transport_fee, branch.transport_available ? "Shared on callback" : "Not applicable")}
                    </div>
                  </div>
                </div>
                {feeSnapshot?.other_fee_notes ? <div className="rounded-[1.2rem] border border-white/70 bg-white/72 p-4">{feeSnapshot.other_fee_notes}</div> : null}
              </CardContent>
            </Card>

            <Card id="visit-planning">
              <CardHeader>
                <CardDescription>Visit and trust</CardDescription>
                <CardTitle>What a parent usually asks next</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
                <p>Campus visits should focus on class strength, hostel safety, faculty continuity, and commute practicality.</p>
                <p>Visit and callback requests now create real follow-up tasks for the internal team.</p>
                {mapsHref ? (
                  <a href={mapsHref} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}>
                    Open map location
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
                    Map location is pending manual verification.
                  </div>
                )}
              </CardContent>
            </Card>

            {branch.primary_review ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-[1rem] border border-[rgba(179,132,67,0.2)] bg-[rgba(179,132,67,0.08)] p-2 text-[rgb(120,83,34)]">
                      <Star className="h-4 w-4" />
                    </div>
                    <div>
                      <CardDescription>Parent trust snapshot</CardDescription>
                      <CardTitle>Public review signal</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
                  <div className="rounded-[1.2rem] border border-white/70 bg-white/72 p-4">
                    <div className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                      {branch.primary_review.rating ? `${branch.primary_review.rating.toFixed(1)} / 5` : "No public rating yet"}
                    </div>
                    <div className="mt-2 text-slate-500">
                      {branch.primary_review.review_count > 0
                        ? `${branch.primary_review.review_count} public ratings tracked`
                        : "Collect branch testimonials during the pilot to strengthen trust."}
                    </div>
                  </div>
                  {branch.primary_review.review_summary_positive ? (
                    <p>
                      <span className="font-medium text-slate-950">What works:</span> {branch.primary_review.review_summary_positive}
                    </p>
                  ) : null}
                  {branch.primary_review.review_summary_negative ? (
                    <p>
                      <span className="font-medium text-slate-950">Parent concern to address:</span> {branch.primary_review.review_summary_negative}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <Card id="admission-path">
              <CardHeader>
                <CardDescription>Online admission path</CardDescription>
                <CardTitle>Form and seat-lock payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  The admission form now captures parent and student details, then generates a seat-lock payment step with webhook-ready payment records.
                </p>
                <div className="rounded-[1.2rem] border border-white/70 bg-white/72 p-4">
                  <div className="font-medium text-slate-950">Current CTA path</div>
                  <div className="mt-2">Counselor - form completion - seat-lock payment - human follow-up queue.</div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={continueHref} className={cn(buttonVariants({ variant: "secondary" }), "gap-2")}>
                    Continue online admission
                  </Link>
                  {primaryContact?.phone ?? branch.contact_phone ? (
                    <Link href={`tel:${primaryContact?.phone ?? branch.contact_phone}`} className={cn(buttonVariants({ variant: "ghost" }), "gap-2")}>
                      <PhoneCall className="h-4 w-4" />
                      Call admissions desk
                    </Link>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-[1.2rem] border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500">
                      <PhoneCall className="h-4 w-4" />
                      Contact pending verification
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
