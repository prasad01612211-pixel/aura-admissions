import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const variants: Record<BadgeVariant, string> = {
  neutral: "border border-slate-200/80 bg-white/80 text-slate-700",
  info: "border border-teal-200/80 bg-teal-50/85 text-teal-800",
  success: "border border-emerald-200/80 bg-emerald-50/85 text-emerald-800",
  warning: "border border-amber-200/80 bg-amber-50/90 text-amber-800",
  danger: "border border-rose-200/80 bg-rose-50/90 text-rose-800",
  accent: "border border-[rgba(179,132,67,0.28)] bg-[rgba(179,132,67,0.12)] text-[rgb(120,83,34)]",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
