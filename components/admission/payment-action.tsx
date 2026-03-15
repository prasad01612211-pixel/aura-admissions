"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function PaymentAction({ paymentId, disabled }: { paymentId: string; disabled?: boolean }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/payments/${paymentId}/simulate-success`, {
      method: "POST",
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to mark the payment as paid.");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-[1.35rem] border border-white/70 bg-white/70 p-4 text-sm leading-6 text-slate-600">
        This project is still using the local payment stub. Use the action below to simulate a successful webhook and continue the workflow.
      </div>
      <Button type="button" onClick={onClick} disabled={disabled || isSubmitting}>
        {isSubmitting ? "Confirming..." : "Mark seat lock as paid (local dev)"}
      </Button>
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
    </div>
  );
}
