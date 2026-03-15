import { notFound } from "next/navigation";
import { CreditCard, Landmark, ShieldCheck, Wallet } from "lucide-react";

import { PaymentAction } from "@/components/admission/payment-action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ensurePaymentPageOpened, getPaymentWorkflowSnapshot } from "@/lib/admission/service";
import { formatCurrency, getLeadDisplayName, humanizeToken } from "@/lib/utils";

type PageProps = {
  params: Promise<{ paymentId: string }>;
};

export default async function PaymentPage({ params }: PageProps) {
  const { paymentId } = await params;
  let snapshot = await getPaymentWorkflowSnapshot(paymentId);

  if (!snapshot) {
    notFound();
  }

  await ensurePaymentPageOpened(paymentId);
  snapshot = (await getPaymentWorkflowSnapshot(paymentId)) ?? snapshot;

  const providerMode =
    typeof snapshot.payment.webhook_payload.provider_mode === "string"
      ? snapshot.payment.webhook_payload.provider_mode
      : "local_stub";

  return (
    <main className="min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1320px] space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/40 bg-[linear-gradient(135deg,rgba(8,22,36,0.97),rgba(18,53,70,0.94)_56%,rgba(16,93,88,0.82))] px-6 py-8 text-white shadow-[0_28px_90px_rgba(8,24,38,0.24)] lg:px-10 lg:py-10">
          <div className="grid gap-8 xl:grid-cols-[1.08fr,0.92fr]">
            <div>
              <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.26em] text-[#e3c78f]">
                Seat-lock payment
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.07em] text-white lg:text-5xl">{formatCurrency(snapshot.payment.amount)}</h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-200">
                Payment clarity matters. This screen keeps the amount, branch, lead context, and current gateway state visible so families and ops stay aligned.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Lead</div>
                <div className="mt-3 text-xl font-semibold tracking-[-0.05em] text-white">
                  {snapshot.lead ? getLeadDisplayName(snapshot.lead.student_name, snapshot.lead.parent_name) : "Unknown lead"}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Branch</div>
                <div className="mt-3 text-xl font-semibold tracking-[-0.05em] text-white">{snapshot.branch.name}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Status</div>
                <div className="mt-3 text-xl font-semibold tracking-[-0.05em] text-white">{humanizeToken(snapshot.payment.status)}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Gateway mode</div>
                <div className="mt-3 text-xl font-semibold tracking-[-0.05em] text-white">{humanizeToken(providerMode)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-[1rem] border border-[rgba(15,118,110,0.15)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <CardDescription>Gateway references</CardDescription>
                  <CardTitle>Order, link, and payment identifiers</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Order</div>
                <div className="mt-2 break-all font-medium text-slate-950">{snapshot.payment.gateway_order_id}</div>
              </div>
              <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Link</div>
                <div className="mt-2 break-all font-medium text-slate-950">{snapshot.payment.gateway_link_id}</div>
              </div>
              <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Payment</div>
                <div className="mt-2 break-all font-medium text-slate-950">{snapshot.payment.gateway_payment_id ?? "Awaiting webhook confirmation"}</div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-[1rem] border border-[rgba(179,132,67,0.2)] bg-[rgba(179,132,67,0.08)] p-2 text-[rgb(120,83,34)]">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <CardDescription>Payment status</CardDescription>
                    <CardTitle>Current conversion state</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                {snapshot.payment.status === "paid" ? (
                  <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                    Seat lock is confirmed. The webhook flow already moved this lead into the next operating stage.
                  </div>
                ) : (
                  <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    This environment is still using the local payment stub. Simulate success below to continue testing the live workflow.
                  </div>
                )}
                <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">
                  <div className="font-medium text-slate-950">What ops should expect</div>
                  <div className="mt-2 leading-6">
                    Once payment is confirmed, the system records the transaction, updates the lead stage, and keeps the branch/payment trail visible for follow-up.
                  </div>
                </div>
                {snapshot.payment.status !== "paid" ? <PaymentAction paymentId={snapshot.payment.id} /> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-[1rem] border border-[rgba(15,118,110,0.15)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <CardDescription>Trust and clarity</CardDescription>
                    <CardTitle>Why this screen exists</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
                <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">The exact amount is visible before anyone takes action.</div>
                <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">Lead and branch context stay visible so payment never feels disconnected from admission.</div>
                <div className="rounded-[1.25rem] border border-white/70 bg-white/72 p-4">Gateway references are preserved for support, reconciliation, and webhook debugging.</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-[1rem] border border-[rgba(15,118,110,0.15)] bg-[rgba(15,118,110,0.08)] p-2 text-teal-700">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <CardDescription>Branch context</CardDescription>
                    <CardTitle>{snapshot.branch.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-slate-600">
                {snapshot.branch.city}, {snapshot.branch.district}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
