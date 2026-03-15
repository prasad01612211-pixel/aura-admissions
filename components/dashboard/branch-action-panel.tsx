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
      <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
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
      <div className="rounded-[1.35rem] border border-white/70 bg-white/72 p-4 text-sm leading-6 text-slate-600">
        These actions write directly into the admissions workflow so counselors and ops see the request immediately.
      </div>
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
            className="dashboard-input min-w-[220px]"
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
      {message ? <div className="rounded-[1.15rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-[1.15rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}
    </div>
  );
}
