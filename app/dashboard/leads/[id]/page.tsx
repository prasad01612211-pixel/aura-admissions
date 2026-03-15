import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Bot, CalendarDays, ClipboardList, MapPinned, MessageSquareText, PhoneCall, Sparkles, UserRound, Wallet } from "lucide-react";

import { DashboardPageIntro, DashboardSummaryStat } from "@/components/dashboard/page-intro";
import { LeadActions } from "@/components/dashboard/lead-actions";
import { LeadStageBadge, LeadStatusBadge } from "@/components/dashboard/state-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadAiTraces } from "@/lib/ai/debug";
import { getLeadDetail } from "@/lib/data/leads";
import { getLeadOperationsSnapshot } from "@/lib/data/lead-ops";
import { getLeadScoreSummary } from "@/lib/scoring/score-band";
import { formatCurrency, formatDateTime, getLeadDisplayName, humanizeToken } from "@/lib/utils";

type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

function SectionHeader({ icon: Icon, description, title }: { icon: LucideIcon; description: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-[1rem] border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <CardDescription>{description}</CardDescription>
        <CardTitle>{title}</CardTitle>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-[1.25rem] border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">{message}</div>;
}

function Surface({ children }: { children: ReactNode }) {
  return <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">{children}</div>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const [detail, operations] = await Promise.all([getLeadDetail(id), getLeadOperationsSnapshot(id)]);

  if (!detail || !operations) {
    notFound();
  }

  const {
    lead,
    assignedBranch,
    preferredBranch,
    owner,
    events,
    messages,
    admissionForm,
    payments,
    tasks,
    recommendedBranches,
    users,
  } = detail;

  const scoreSummary = getLeadScoreSummary({
    lead,
    events,
    payments,
  });
  const payoutChecklist = [
    { key: "branch_mapped", label: "Branch mapped", ready: Boolean(assignedBranch ?? preferredBranch) },
    { key: "recommendation_logged", label: "Recommendation logged", ready: recommendedBranches.length > 0 || operations.recommendations.length > 0 },
    { key: "form_submitted", label: "Admission form submitted", ready: Boolean(admissionForm) },
    { key: "seat_lock_paid", label: "Seat-lock paid", ready: lead.seat_lock_paid || payments.some((payment) => payment.status === "paid") },
    { key: "conversion_created", label: "Conversion row created", ready: Boolean(operations.conversion) },
    { key: "commission_ready", label: "Commission ledger created", ready: Boolean(operations.commission) },
  ];
  const activeTasks = tasks.filter((task) => !["completed", "cancelled"].includes(task.status));
  const aiTraces = getLeadAiTraces(events);
  const leadName = getLeadDisplayName(lead.student_name, lead.parent_name);
  const primaryBranch = assignedBranch ?? preferredBranch;
  const primaryBranchCode = primaryBranch?.code ?? recommendedBranches[0]?.branch_code ?? null;
  const primaryBranchName = primaryBranch?.name ?? recommendedBranches[0]?.branch_name ?? "Unassigned";
  const lastVisit = operations.visits[0] ?? null;
  const lastPayment = payments[0] ?? null;

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Lead intelligence"
        badge={`${humanizeToken(lead.stage)} / ${humanizeToken(lead.status)}`}
        icon={UserRound}
        tone="dark"
        title={leadName}
        description="This workspace combines contact context, branch fit, conversion posture, operational follow-up, and AI handling in one premium admissions view."
        actions={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.08] p-4 text-sm text-slate-200">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">Branch posture</div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">{primaryBranchName}</div>
              <div className="mt-2 leading-6 text-slate-300">{owner?.name ?? "Unassigned owner"} is currently responsible for this lead.</div>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.08] p-4 text-sm text-slate-200">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">Latest movement</div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
                {lead.last_incoming_at ? formatDateTime(lead.last_incoming_at) : "No inbound yet"}
              </div>
              <div className="mt-2 leading-6 text-slate-300">
                {lastVisit ? `Last visit status: ${humanizeToken(lastVisit.status)}` : "No campus visit logged yet."}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              {primaryBranchCode ? (
                <Link
                  href={`/branches/${primaryBranchCode}?leadId=${lead.id}`}
                  className={buttonVariants({ variant: "outline", className: "border-white/15 bg-white/10 text-white hover:bg-white/16 hover:text-white" })}
                >
                  Open branch page
                </Link>
              ) : null}
              <Link
                href={`/admission/${lead.id}${primaryBranchCode ? `?branch=${primaryBranchCode}` : ""}`}
                className={buttonVariants({ className: "min-w-[170px]" })}
              >
                Open admission form
              </Link>
            </div>
          </div>
        }
        stats={[
          { label: "Lead score", value: lead.lead_score.toLocaleString(), helper: `${humanizeToken(scoreSummary.band)} band` },
          { label: "Intent score", value: operations.intent.score.toLocaleString(), helper: humanizeToken(operations.intent.label) },
          { label: "Open tasks", value: activeTasks.length.toLocaleString(), helper: `${messages.length} messages / ${payments.length} payments tracked` },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardSummaryStat label="Primary branch" value={primaryBranchName} helper="Current branch context used for follow-up and conversion." />
        <DashboardSummaryStat
          label="Location"
          value={lead.area ? `${lead.area}, ${lead.city ?? "Unknown city"}` : lead.city ?? "Unknown city"}
          helper={lead.district ?? "District not captured yet"}
        />
        <DashboardSummaryStat label="Parent phone" value={lead.parent_phone ?? lead.phone ?? "Not available"} helper="Primary contact path for human follow-up." />
        <DashboardSummaryStat
          label="Commercial state"
          value={operations.commission ? humanizeToken(operations.commission.payout_status) : "Not ready"}
          helper={lastPayment ? `${humanizeToken(lastPayment.status)} payment exists` : "No payment logged yet"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr,0.92fr,0.92fr]">
        <Card>
          <CardHeader>
            <SectionHeader icon={PhoneCall} description="Lead profile" title="Contact and qualification context" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Surface>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Contacts</div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div>
                  <div className="text-slate-500">Parent phone</div>
                  <div className="font-medium text-slate-950">{lead.parent_phone ?? lead.phone ?? "Not available"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Student phone</div>
                  <div className="font-medium text-slate-950">{lead.student_phone ?? "Not available"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Owner</div>
                  <div className="font-medium text-slate-950">{owner?.name ?? "Unassigned"}</div>
                </div>
              </div>
            </Surface>
            <Surface>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Fit snapshot</div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div>
                  <div className="text-slate-500">Course interest</div>
                  <div className="font-medium text-slate-950">{lead.course_interest ?? "Not captured yet"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Preferred location</div>
                  <div className="font-medium text-slate-950">{lead.preferred_location ?? "Not captured yet"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Budget range</div>
                  <div className="font-medium text-slate-950">{lead.budget_range ?? "Not discussed"}</div>
                </div>
              </div>
            </Surface>
            <div className="md:col-span-2">
              <Surface>
                <div className="flex flex-wrap items-center gap-2">
                  <LeadStageBadge stage={lead.stage} />
                  <LeadStatusBadge status={lead.status} />
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3 text-sm text-slate-600">
                  <div>
                    <div className="text-slate-500">Lead score</div>
                    <div className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{lead.lead_score}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Intent</div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {operations.intent.score} / {humanizeToken(operations.intent.label)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Location</div>
                    <div className="mt-1 font-medium text-slate-950">
                      {lead.area ? `${lead.area}, ` : ""}
                      {lead.city ?? "Unknown city"}, {lead.district ?? "Unknown district"}
                    </div>
                  </div>
                </div>
              </Surface>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader icon={Wallet} description="Conversion and payout" title="Readiness summary" />
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <Surface>
              <div className="text-slate-500">Conversion status</div>
              <div className="mt-2 font-medium text-slate-950">
                {operations.conversion ? humanizeToken(operations.conversion.joined_status) : "No conversion row yet"}
              </div>
            </Surface>
            <Surface>
              <div className="text-slate-500">Commission status</div>
              <div className="mt-2 font-medium text-slate-950">{operations.commission ? humanizeToken(operations.commission.payout_status) : "Not ready"}</div>
              {operations.commission ? (
                <div className="mt-2 leading-6 text-slate-500">
                  Expected {formatCurrency(operations.commission.expected_amount)}
                  {operations.commission.payout_due_date ? ` / due ${formatDateTime(operations.commission.payout_due_date)}` : ""}
                </div>
              ) : null}
            </Surface>
            <div className="space-y-2">
              {payoutChecklist.map((check) => (
                <div key={check.key} className="flex items-center justify-between rounded-[1.15rem] border border-white/70 bg-white/72 px-4 py-3">
                  <span>{check.label}</span>
                  <span className={check.ready ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>{check.ready ? "Ready" : "Pending"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader icon={ClipboardList} description="Internal actions" title="Human follow-up controls" />
          </CardHeader>
          <CardContent>
            <LeadActions leadId={lead.id} branchId={assignedBranch?.id ?? preferredBranch?.id ?? null} ownerUserId={lead.owner_user_id} users={users} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <SectionHeader icon={MapPinned} description="Recommendation snapshot" title="Top branch matches" />
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendedBranches.length > 0 ? (
              recommendedBranches.map((branch) => (
                <Surface key={branch.branch_id}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-slate-950">{branch.branch_name}</div>
                      <div className="text-sm text-slate-500">{branch.city}, {branch.district}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Score</div>
                      <div className="text-lg font-semibold text-slate-950">{branch.score}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    {[...(branch.reasons ?? []), branch.recommendation_basis ? `basis: ${branch.recommendation_basis}` : null].filter(Boolean).join(" / ") || "Fallback recommendation"}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/branches/${branch.branch_code}?leadId=${lead.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      View branch page
                    </Link>
                    <Link href={`/admission/${lead.id}?branch=${branch.branch_code}`} className={buttonVariants({ size: "sm" })}>
                      Open admission form
                    </Link>
                  </div>
                </Surface>
              ))
            ) : (
              <EmptyState message="No branch recommendations logged yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader icon={Sparkles} description="Intent scoring" title="Why this lead is priority or not" />
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <Surface>
              <div className="text-slate-500">Intent label</div>
              <div className="mt-2 font-medium text-slate-950">
                {operations.intent.score} / {humanizeToken(operations.intent.label)}
              </div>
            </Surface>
            {operations.intent.events.map((factor) => (
              <div key={factor.key} className="flex items-center justify-between rounded-[1.15rem] border border-white/70 bg-white/72 p-4">
                <div>
                  <div className="font-medium text-slate-950">{factor.label}</div>
                  <div className="text-slate-500">{factor.reason}</div>
                </div>
                <div className={`font-semibold ${factor.applied ? "text-emerald-700" : "text-slate-400"}`}>{factor.applied ? `${factor.points > 0 ? "+" : ""}${factor.points}` : "0"}</div>
              </div>
            ))}
            <Surface>
              <div className="text-slate-500">Legacy lead score band</div>
              <div className="mt-2 font-medium text-slate-950">
                {lead.lead_score} / {humanizeToken(scoreSummary.band)}
              </div>
            </Surface>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader icon={Sparkles} description="Objection tracking" title="What is blocking the conversion" />
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            {operations.objections.length > 0 ? (
              operations.objections.map((objection) => (
                <Surface key={objection.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-950">{humanizeToken(objection.objection_type)}</div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{humanizeToken(objection.severity)}</div>
                  </div>
                  <div className="mt-2">{objection.objection_text}</div>
                  <div className="mt-2 text-slate-500">{objection.normalized_objection}</div>
                  {objection.suggested_response ? <div className="mt-3 rounded-[1rem] bg-slate-50 p-3 text-slate-700">Suggested response: {objection.suggested_response}</div> : null}
                </Surface>
              ))
            ) : (
              <EmptyState message="No objections captured yet." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionHeader icon={CalendarDays} description="Visit bookings" title="Campus visit progression" />
          </CardHeader>
          <CardContent className="space-y-4">
            {operations.visits.length > 0 ? (
              operations.visits.map((visit) => (
                <Surface key={visit.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="font-medium text-slate-950">{formatDateTime(visit.scheduled_for)}</div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{humanizeToken(visit.status)}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Attendees: {visit.attendee_count}
                    {visit.outcome_status ? ` / outcome: ${humanizeToken(visit.outcome_status)}` : ""}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{visit.notes ?? "No visit notes"}</div>
                </Surface>
              ))
            ) : (
              <EmptyState message="No visit bookings logged yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader icon={Wallet} description="Payment history" title="Seat-lock and payment progression" />
          </CardHeader>
          <CardContent className="space-y-4">
            {payments.length > 0 ? (
              payments.map((payment) => (
                <Surface key={payment.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="font-medium text-slate-950">{formatCurrency(payment.amount)}</div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{humanizeToken(payment.status)}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">Purpose: {humanizeToken(payment.purpose)}</div>
                  <div className="mt-2 text-sm text-slate-600">{payment.paid_at ? `Paid ${formatDateTime(payment.paid_at)}` : `Created ${formatDateTime(payment.created_at)}`}</div>
                </Surface>
              ))
            ) : (
              <EmptyState message="No payment link created yet." />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <SectionHeader icon={MessageSquareText} description="Message history" title="WhatsApp conversation trail" />
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length > 0 ? (
            messages.map((message) => (
              <Surface key={message.id}>
                <div className="font-medium text-slate-950">{humanizeToken(message.direction)}</div>
                <div className="mt-2 text-sm text-slate-600">{message.message_body ?? "Media or template event"}</div>
                <div className="mt-2 text-xs uppercase tracking-wide text-slate-400">{formatDateTime(message.created_at)}</div>
              </Surface>
            ))
          ) : (
            <EmptyState message="No messages logged yet." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader icon={Bot} description="AI trace" title="Model replies, routes, and tool calls" />
        </CardHeader>
        <CardContent className="space-y-4">
          {aiTraces.length > 0 ? (
            aiTraces.map((trace) => (
              <Surface key={trace.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="font-medium text-slate-950">{humanizeToken(trace.eventType)}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">{formatDateTime(trace.createdAt)}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <span>{humanizeToken(trace.eventSource)}</span>
                  {trace.route ? <span>{humanizeToken(trace.route)}</span> : null}
                  {trace.model ? <span>{trace.model}</span> : null}
                  {trace.promptVersion ? <span>{trace.promptVersion}</span> : null}
                </div>
                {trace.confidence !== null ? (
                  <div className="mt-3 rounded-[1rem] bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Confidence: {Math.round(trace.confidence * 100)}%
                    {trace.languageCode ? ` / ${trace.languageCode}` : ""}
                    {trace.followUpNeeded !== null ? ` / follow-up ${trace.followUpNeeded ? "needed" : "not needed"}` : ""}
                  </div>
                ) : null}
                {trace.crmNote ? <div className="mt-3 text-sm text-slate-600">{trace.crmNote}</div> : null}
                {trace.escalationReason ? <div className="mt-3 text-sm text-amber-700">Escalation reason: {trace.escalationReason}</div> : null}
                {trace.error ? <div className="mt-3 text-sm text-rose-700">Error: {trace.error}</div> : null}
                {trace.reason ? <div className="mt-3 text-sm text-slate-500">Reason: {trace.reason}</div> : null}
                {trace.toolTraces.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {trace.toolTraces.map((toolTrace, index) => (
                      <div key={`${trace.id}-${toolTrace.name}-${index}`} className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                        <div className="font-medium text-slate-950">{toolTrace.name}</div>
                        <div className="mt-2 text-xs uppercase tracking-wide text-slate-400">Arguments</div>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-600">{JSON.stringify(toolTrace.arguments, null, 2)}</pre>
                        <div className="mt-3 text-xs uppercase tracking-wide text-slate-400">Result</div>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-600">{JSON.stringify(toolTrace.result, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Surface>
            ))
          ) : (
            <EmptyState message="AI has not handled this lead yet." />
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <CardHeader>
            <SectionHeader icon={Sparkles} description="Event timeline" title="Every meaningful lead state change" />
          </CardHeader>
          <CardContent className="space-y-4">
            {events.map((event) => (
              <Surface key={event.id}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="font-medium text-slate-950">{humanizeToken(event.event_type)}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">{formatDateTime(event.created_at)}</div>
                </div>
                <div className="mt-2 text-sm text-slate-600">{humanizeToken(event.event_source)}</div>
              </Surface>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader icon={ClipboardList} description="Task queue" title="Operational follow-ups" />
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTasks.length > 0 ? (
              activeTasks.map((task) => (
                <Surface key={task.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="font-medium text-slate-950">{task.title ?? humanizeToken(task.task_type)}</div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{humanizeToken(task.priority)}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{task.description ?? task.notes ?? "No notes"}</div>
                  <div className="mt-3 text-xs uppercase tracking-wide text-slate-400">{task.due_at ? `Due ${formatDateTime(task.due_at)}` : "No due date"}</div>
                </Surface>
              ))
            ) : (
              <EmptyState message="No open tasks remain on this lead." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
