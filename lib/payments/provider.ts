import { createHmac, randomUUID } from "crypto";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Branch, Payment } from "@/types/domain";

export const defaultSeatLockAmount = 1000;

export function getBaseAppUrl() {
  return publicEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
}

export function buildPaymentUrl(paymentId: string) {
  return `${getBaseAppUrl()}/payment/${paymentId}`;
}

export function buildPaymentStub(args: {
  leadId: string;
  branch: Branch;
  amount?: number;
}) {
  const paymentId = randomUUID();
  const amount = args.amount ?? defaultSeatLockAmount;

  return {
    payment: {
      id: paymentId,
      lead_id: args.leadId,
      branch_id: args.branch.id,
      gateway: "razorpay",
      gateway_order_id: `stub_order_${paymentId.replace(/-/g, "").slice(0, 18)}`,
      gateway_payment_id: null,
      gateway_link_id: `stub_link_${paymentId.replace(/-/g, "").slice(0, 18)}`,
      amount,
      currency: "INR",
      purpose: "seat_lock",
      status: "pending",
      webhook_payload: {
        provider_mode: serverEnv.RAZORPAY_KEY_ID && serverEnv.RAZORPAY_KEY_SECRET ? "configured_stub" : "local_stub",
      },
      paid_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies Payment,
    checkout_url: buildPaymentUrl(paymentId),
  };
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null) {
  if (!serverEnv.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured.");
  }

  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", serverEnv.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return expected === signature;
}

export function extractRazorpayWebhookData(payload: Record<string, unknown>) {
  const payloadEntity =
    payload.payload && typeof payload.payload === "object" ? (payload.payload as Record<string, unknown>) : {};
  const paymentEntity =
    payloadEntity.payment && typeof payloadEntity.payment === "object"
      ? ((payloadEntity.payment as Record<string, unknown>).entity as Record<string, unknown> | undefined)
      : undefined;
  const linkEntity =
    payloadEntity.payment_link && typeof payloadEntity.payment_link === "object"
      ? ((payloadEntity.payment_link as Record<string, unknown>).entity as Record<string, unknown> | undefined)
      : undefined;

  return {
    event: typeof payload.event === "string" ? payload.event : "unknown",
    gateway_payment_id: typeof paymentEntity?.id === "string" ? paymentEntity.id : null,
    gateway_order_id: typeof paymentEntity?.order_id === "string" ? paymentEntity.order_id : null,
    gateway_link_id: typeof linkEntity?.id === "string" ? linkEntity.id : null,
    amount:
      typeof paymentEntity?.amount === "number"
        ? paymentEntity.amount / 100
        : typeof linkEntity?.amount === "number"
          ? linkEntity.amount / 100
          : null,
  };
}
