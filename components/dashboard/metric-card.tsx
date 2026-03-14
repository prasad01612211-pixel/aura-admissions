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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardDescription>{metric.label}</CardDescription>
          <CardTitle className="mt-2 text-3xl">{metric.value}</CardTitle>
        </div>
        <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500">{metric.helper}</p>
      </CardContent>
    </Card>
  );
}
