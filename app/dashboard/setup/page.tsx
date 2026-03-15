import { ClipboardCheck, MessageSquareText, Network, ShieldCheck } from "lucide-react";

import { DashboardPageIntro, DashboardSummaryStat } from "@/components/dashboard/page-intro";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { getSetupWizardSnapshot } from "@/lib/operations/setup";

export default async function SetupPage() {
  const snapshot = await getSetupWizardSnapshot();
  const completedSteps = snapshot.steps.filter((step) => step.completed).length;

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Setup control"
        badge="Operations foundation"
        icon={ClipboardCheck}
        title="Structured onboarding for institutions, branches, programs, and communication rules."
        description="This wizard is the operating backbone of the product. When setup is clean, branch trust, admissions flow, WhatsApp behavior, and payout logic all become far more reliable."
        stats={[
          { label: "Completed steps", value: completedSteps.toLocaleString(), helper: "How much of the operating model is already structured." },
          { label: "Total steps", value: snapshot.steps.length.toLocaleString(), helper: "Required and optional configuration across the system." },
          { label: "Publish ready", value: snapshot.publish_ready ? "Yes" : "No", helper: "Whether the current setup can be safely published." },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardSummaryStat label="Steps complete" value={completedSteps.toLocaleString()} helper="Saved progress across organization, branch, fee, and trust setup." />
        <DashboardSummaryStat label="Blockers" value={snapshot.blockers.length.toLocaleString()} helper="Items still preventing a clean publish state." />
        <DashboardSummaryStat label="WhatsApp state" value={snapshot.communication_settings?.sandbox_mode ? "Sandbox" : "Live-ready"} helper="Current messaging posture from operations settings." />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/72 p-5 shadow-[0_18px_48px_rgba(17,32,49,0.06)]">
          <div className="inline-flex rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
            <Network className="h-4 w-4" />
          </div>
          <div className="mt-4 text-lg font-semibold tracking-[-0.04em] text-slate-950">Network structure</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">Keep organizations, institutions, branches, programs, and intake aligned before scaling live leads.</div>
        </div>
        <div className="rounded-[1.5rem] border border-white/70 bg-white/72 p-5 shadow-[0_18px_48px_rgba(17,32,49,0.06)]">
          <div className="inline-flex rounded-2xl border border-[rgba(179,132,67,0.22)] bg-[rgba(179,132,67,0.08)] p-2 text-[rgb(120,83,34)]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="mt-4 text-lg font-semibold tracking-[-0.04em] text-slate-950">Trust assets</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">The clearer your branch proof, fee structure, and documents are, the smoother the conversion flow becomes.</div>
        </div>
        <div className="rounded-[1.5rem] border border-white/70 bg-white/72 p-5 shadow-[0_18px_48px_rgba(17,32,49,0.06)]">
          <div className="inline-flex rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
            <MessageSquareText className="h-4 w-4" />
          </div>
          <div className="mt-4 text-lg font-semibold tracking-[-0.04em] text-slate-950">Communication controls</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">Sandbox mode, business hours, and payment terms should be deliberate before live outreach starts.</div>
        </div>
      </section>

      <SetupWizard snapshot={snapshot} />
    </div>
  );
}
