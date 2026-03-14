import { notFound } from "next/navigation";

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
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
        <Card>
          <CardHeader>
            <CardDescription>Seat-lock payment</CardDescription>
            <CardTitle>{formatCurrency(snapshot.payment.amount)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-slate-600">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-slate-500">Lead</div>
                <div className="font-medium text-slate-950">
                  {snapshot.lead ? getLeadDisplayName(snapshot.lead.student_name, snapshot.lead.parent_name) : "Unknown lead"}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Branch</div>
                <div className="font-medium text-slate-950">{snapshot.branch.name}</div>
              </div>
              <div>
                <div className="text-slate-500">Status</div>
                <div className="font-medium text-slate-950">{humanizeToken(snapshot.payment.status)}</div>
              </div>
              <div>
                <div className="text-slate-500">Gateway mode</div>
                <div className="font-medium text-slate-950">{humanizeToken(providerMode)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-slate-500">Gateway references</div>
              <div className="mt-2 space-y-1">
                <div>Order: {snapshot.payment.gateway_order_id}</div>
                <div>Link: {snapshot.payment.gateway_link_id}</div>
                <div>Payment: {snapshot.payment.gateway_payment_id ?? "Awaiting webhook"}</div>
              </div>
            </div>

            {snapshot.payment.status === "paid" ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                Seat lock is confirmed. The payment webhook flow already moved this lead to the next stage.
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="font-medium text-amber-900">Local payment stub</div>
                <div className="text-amber-800">
                  Use the button below to simulate a successful Razorpay webhook while credentials are still stubbed.
                </div>
                <PaymentAction paymentId={snapshot.payment.id} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
