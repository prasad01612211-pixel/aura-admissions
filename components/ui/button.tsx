import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const baseStyles =
  "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30 disabled:pointer-events-none disabled:opacity-50";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border border-[rgba(15,118,110,0.4)] bg-[linear-gradient(135deg,#0f766e,#155e75)] text-white shadow-[0_14px_32px_rgba(15,118,110,0.22)] hover:brightness-105",
  secondary:
    "border border-[rgba(17,32,49,0.18)] bg-[linear-gradient(135deg,#112031,#1f3a4d)] text-white shadow-[0_14px_32px_rgba(17,32,49,0.16)] hover:brightness-105",
  outline:
    "border border-[rgba(17,32,49,0.14)] bg-white/75 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] hover:border-[rgba(179,132,67,0.3)] hover:bg-[rgba(179,132,67,0.08)]",
  ghost: "bg-transparent text-slate-700 hover:bg-white/55",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonVariants({
  className,
  size = "md",
  variant = "primary",
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({ className, size = "md", variant = "primary", ...props }: ButtonProps) {
  return <button className={buttonVariants({ className, size, variant })} {...props} />;
}
