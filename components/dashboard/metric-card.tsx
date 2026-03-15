import { AlertCircle, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetric } from "@/types/domain";

const icons = {
  attention: AlertCircle,
  neutral: Minus,
  positive: ArrowUpRight,
} as const;

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = icons[metric.tone];
  const toneClass =
    metric.tone === "positive"
      ? "border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.86),rgba(255,252,247,0.82))] text-emerald-700"
      : metric.tone === "attention"
        ? "border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.92),rgba(255,252,247,0.82))] text-amber-700"
        : "border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,252,247,0.82))] text-slate-600";

  return (
    <Card className="overflow-hidden border-white/70">
      <CardHeader className="relative flex flex-row items-start justify-between gap-4 pb-4">
        <div className="absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(179,132,67,0.36)] to-transparent" />
        <div>
          <CardDescription className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">{metric.label}</CardDescription>
          <CardTitle className="mt-3 text-[2rem] leading-none tracking-[-0.06em]">{metric.value}</CardTitle>
        </div>
        <div className={`rounded-[1.15rem] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">{metric.helper}</p>
      </CardContent>
    </Card>
  );
}
