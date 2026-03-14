import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const baseStyles =
  "inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:pointer-events-none disabled:opacity-50";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-sky-600 text-white hover:bg-sky-500",
  secondary: "bg-slate-900 text-white hover:bg-slate-800",
  outline: "border border-slate-300 bg-white text-slate-900 hover:border-sky-300 hover:bg-sky-50",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
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
