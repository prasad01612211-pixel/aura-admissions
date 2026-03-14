"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type BranchActionPanelProps = {
  branchId: string;
  leadId?: string | null;
};

export function BranchActionPanel({ branchId, leadId }: BranchActionPanelProps) {
  const router = useRouter();
  const [preferredSlot, setPreferredSlot] = useState("Sunday 11:00 AM");
  const [activeAction, setActiveAction] = useState<"callback" | "visit" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!leadId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Open this page with a `leadId` to log callback or visit requests into the funnel.
      </div>
    );
  }

  const submitAction = async (payload: Record<string, unknown>, successMessage: string, action: "callback" | "visit") => {
    setActiveAction(action);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/lead-actions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ leadId, ...payload }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to update the lead.");
      setActiveAction(null);
      return;
    }

    setMessage(successMessage);
    setActiveAction(null);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[0.8fr,1.2fr]">
        <Button
          type="button"
          onClick={() =>
            submitAction(
              {
                type: "request_callback",
                branchId,
              },
              "Callback request logged and routed to the counselor queue.",
              "callback",
            )
          }
          disabled={activeAction !== null}
        >
          {activeAction === "callback" ? "Logging..." : "Talk to counselor"}
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={preferredSlot}
            onChange={(event) => setPreferredSlot(event.target.value)}
            className="h-11 min-w-[220px] rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900"
            placeholder="Preferred slot"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              submitAction(
                {
                  type: "request_visit",
                  branchId,
                  preferredSlot,
                },
                "Visit request logged and routed to operations.",
                "visit",
              )
            }
            disabled={activeAction !== null || preferredSlot.trim().length < 4}
          >
            {activeAction === "visit" ? "Logging..." : "Book campus visit"}
          </Button>
        </div>
      </div>
      {message ? <div className="text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
    </div>
  );
}
