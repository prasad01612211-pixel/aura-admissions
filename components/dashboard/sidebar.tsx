"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckSquare,
  IndianRupee,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  Route,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";
import type { User } from "@/types/domain";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Command",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/setup", label: "Setup", icon: Route },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { href: "/dashboard/leads", label: "Leads", icon: BarChart3 },
      { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/dashboard/visits", label: "Visits", icon: CalendarDays },
      { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    label: "Network",
    items: [
      { href: "/dashboard/branches", label: "Branches", icon: Building2 },
      { href: "/dashboard/institutions", label: "Institutions", icon: Landmark },
      { href: "/dashboard/revenue", label: "Revenue", icon: IndianRupee },
    ],
  },
];

const mobileNavItems = navSections.flatMap((section) => section.items);

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type DashboardSidebarProps = {
  authEnabled: boolean;
  operator: Pick<User, "name" | "role" | "email">;
};

export function DashboardSidebar({ authEnabled, operator }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div className="lg:hidden">
        <div className="dashboard-shell overflow-hidden rounded-[1.75rem] border border-white/40 bg-[linear-gradient(135deg,rgba(9,22,35,0.95),rgba(20,49,67,0.94))] px-5 py-5 text-white shadow-[0_24px_60px_rgba(8,24,38,0.24)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[#d8bf8b]">
                Aura Admissions
              </div>
              <div className="mt-3 text-xl font-semibold tracking-[-0.04em]">Executive Ops Console</div>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Premium admissions command center for branch readiness, lead velocity, and counselor execution.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-right">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">Signed in</div>
              <div className="mt-1 text-sm font-semibold text-white">{operator.role}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{operator.name}</div>
              <div className="truncate text-xs text-slate-300">{operator.email ?? "No email"}</div>
            </div>
            {authEnabled ? (
              <LogoutButton compact className="border-white/15 bg-white/8 text-white hover:bg-white/12 hover:text-white" />
            ) : (
              <div className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                Local mode
              </div>
            )}
          </div>
          <nav className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all",
                    active
                      ? "border-[rgba(216,191,139,0.45)] bg-[rgba(216,191,139,0.18)] text-white shadow-[0_12px_28px_rgba(0,0,0,0.2)]"
                      : "border-white/10 bg-white/6 text-slate-200",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <aside className="dashboard-shell sticky top-4 hidden h-[calc(100vh-2rem)] w-[310px] flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,22,36,0.98),rgba(16,37,53,0.96)_55%,rgba(13,52,68,0.92))] px-6 py-6 text-slate-100 shadow-[0_28px_80px_rgba(6,20,31,0.28)] lg:flex">
        <div className="mb-8">
          <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-[#d8bf8b]">
            Aura Admissions
          </div>
          <div className="mt-4 text-[2rem] font-semibold leading-none tracking-[-0.06em]">Executive Ops</div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-300">
            Built for admissions teams that want premium control over intake, follow-up quality, and conversion readiness.
          </p>
          <div className="mt-5 rounded-[1.45rem] border border-white/10 bg-white/[0.05] p-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Signed in</div>
            <div className="mt-2 truncate text-lg font-semibold text-white">{operator.name}</div>
            <div className="mt-1 truncate text-sm text-slate-300">{operator.email ?? "No email configured"}</div>
            <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#d8bf8b]">
              {operator.role}
            </div>
          </div>
        </div>

        <nav className="space-y-6">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="mb-3 px-3 font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">{section.label}</div>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between rounded-[1.35rem] border px-4 py-3.5 text-sm transition-all duration-200",
                        active
                          ? "border-[rgba(216,191,139,0.34)] bg-[linear-gradient(135deg,rgba(216,191,139,0.18),rgba(255,255,255,0.06))] text-white shadow-[0_18px_40px_rgba(0,0,0,0.2)]"
                          : "border-transparent bg-white/[0.04] text-slate-300 hover:border-white/10 hover:bg-white/[0.08] hover:text-white",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "rounded-2xl p-2 transition-colors",
                            active ? "bg-black/20 text-[#f3dfb7]" : "bg-white/8 text-slate-300 group-hover:text-white",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </span>
                      <span className={cn("h-2 w-2 rounded-full", active ? "bg-[#d8bf8b]" : "bg-transparent")} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Current Focus</div>
            <div className="mt-2 text-base font-semibold text-white">Branch readiness and counselor response quality</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Keep branch, fee, and trust data clean. Everything upstream becomes easier once the operating base is reliable.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Signal</div>
              <div className="mt-2 text-lg font-semibold text-white">High intent</div>
              <div className="mt-1 text-sm text-slate-300">Hot lead flow stays visible.</div>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Control</div>
              <div className="mt-2 text-lg font-semibold text-white">Human-first</div>
              <div className="mt-1 text-sm text-slate-300">Sensitive steps stay escalated.</div>
            </div>
          </div>
          {authEnabled ? (
            <LogoutButton className="border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1] hover:text-white" />
          ) : (
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm text-slate-300">
              Local fallback mode is active. Supabase Auth sign-out is unavailable.
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
