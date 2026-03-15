import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type IntroStat = {
  label: string;
  value: string;
  helper?: string;
};

type DashboardPageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  tone?: "dark" | "light";
  stats?: IntroStat[];
  actions?: ReactNode;
};

export function DashboardPageIntro({
  eyebrow,
  title,
  description,
  icon: Icon,
  badge,
  tone = "light",
  stats = [],
  actions,
}: DashboardPageIntroProps) {
  const dark = tone === "dark";

  return (
    <Card
      className={cn(
        "overflow-hidden",
        dark
          ? "border-[rgba(179,132,67,0.18)] bg-[linear-gradient(135deg,rgba(11,27,40,0.97),rgba(19,53,69,0.93)_55%,rgba(18,83,86,0.84))] text-white shadow-[0_28px_90px_rgba(8,24,38,0.22)]"
          : "border-white/70 bg-[linear-gradient(180deg,rgba(255,252,247,0.88),rgba(255,248,240,0.8))]",
      )}
    >
      <CardContent className="grid gap-6 px-6 py-6 sm:px-7 sm:py-7 xl:grid-cols-[1.2fr,0.8fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={dark ? "accent" : "info"}>{eyebrow}</Badge>
            {badge ? (
              <Badge
                className={cn(
                  dark ? "border-white/15 bg-white/10 text-slate-100" : "border-slate-200/80 bg-white/70 text-slate-700",
                )}
                variant="neutral"
              >
                {badge}
              </Badge>
            ) : null}
          </div>

          <div className="mt-5 flex items-start gap-4">
            <div
              className={cn(
                "rounded-[1.1rem] border p-3",
                dark
                  ? "border-white/10 bg-black/15 text-[#f0d59c]"
                  : "border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] text-teal-700",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="max-w-3xl">
              <h2 className={cn("text-3xl font-semibold tracking-[-0.06em] sm:text-[2.4rem]", dark ? "text-white" : "text-slate-950")}>
                {title}
              </h2>
              <p className={cn("mt-3 text-sm leading-7 sm:text-base", dark ? "text-slate-200" : "text-slate-600")}>{description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {actions}
          {stats.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    "rounded-[1.35rem] border p-4",
                    dark
                      ? "border-white/10 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "border-white/70 bg-white/70",
                  )}
                >
                  <div className={cn("font-mono text-[11px] uppercase tracking-[0.22em]", dark ? "text-slate-300" : "text-slate-500")}>
                    {stat.label}
                  </div>
                  <div className={cn("mt-2 text-2xl font-semibold tracking-[-0.05em]", dark ? "text-white" : "text-slate-950")}>
                    {stat.value}
                  </div>
                  {stat.helper ? <div className={cn("mt-2 text-sm leading-6", dark ? "text-slate-300" : "text-slate-600")}>{stat.helper}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

type DashboardSummaryStatProps = {
  label: string;
  value: string;
  helper?: string;
};

export function DashboardSummaryStat({ label, value, helper }: DashboardSummaryStatProps) {
  return (
    <Card className="border-white/70 bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(255,248,240,0.8))]">
      <CardContent className="px-6 py-5 sm:px-7">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.06em] text-slate-950">{value}</div>
        {helper ? <div className="mt-3 text-sm leading-6 text-slate-600">{helper}</div> : null}
      </CardContent>
    </Card>
  );
}
