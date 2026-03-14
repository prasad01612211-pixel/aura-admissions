import Link from "next/link";
import { BarChart3, Building2, CheckSquare, IndianRupee, Landmark, LayoutDashboard, Megaphone, Route, CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/setup", label: "Setup", icon: Route },
  { href: "/dashboard/leads", label: "Leads", icon: BarChart3 },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/visits", label: "Visits", icon: CalendarDays },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/branches", label: "Branches", icon: Building2 },
  { href: "/dashboard/institutions", label: "Institutions", icon: Landmark },
  { href: "/dashboard/revenue", label: "Revenue", icon: IndianRupee },
];

export function DashboardSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-slate-200 bg-slate-950 px-5 py-6 text-slate-200 lg:flex">
      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.3em] text-sky-300">Admissions MVP</div>
        <div className="mt-3 text-2xl font-semibold">Ops Console</div>
        <p className="mt-2 text-sm text-slate-400">Designed for a 3-person admissions team handling high-intent WhatsApp leads.</p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
                "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <div className="font-medium text-white">Current milestone</div>
        <p className="mt-2 text-slate-400">Lead import, admissions, revenue tracking, and WhatsApp workflow automation are active. Live provider credentials and verified branch data are the remaining production inputs.</p>
      </div>
    </aside>
  );
}
