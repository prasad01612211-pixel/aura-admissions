import { requireDashboardOperator } from "@/lib/auth/operator";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Badge } from "@/components/ui/badge";
import { isSupabaseConfigured } from "@/lib/env";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireDashboardOperator();
  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-4 lg:flex-row">
        <DashboardSidebar authEnabled={isSupabaseConfigured} operator={session.operator} />
        <main className="dashboard-shell min-h-screen flex-1 overflow-hidden rounded-[2rem] border border-white/50 bg-[rgba(255,252,247,0.62)] shadow-[0_28px_90px_rgba(17,32,49,0.12)] backdrop-blur-xl">
          <header className="border-b border-[rgba(17,32,49,0.08)] bg-[linear-gradient(180deg,rgba(255,252,247,0.88),rgba(255,252,247,0.68))] px-6 py-6 backdrop-blur lg:px-10">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[#8c6b38]">Admissions Operations</div>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-4xl">
                  Production command center for intake, conversion, and counselor execution
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Keep your team aligned on the signal that matters most: branch readiness, parent intent, and the actions that move a lead to admission.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.35rem] border border-white/60 bg-white/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Data plane</div>
                  <div className="mt-2">
                    <Badge variant={isSupabaseConfigured ? "success" : "warning"}>
                      {isSupabaseConfigured ? "Supabase connected" : "Fallback mode"}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-[1.35rem] border border-white/60 bg-white/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Operator role</div>
                  <div className="mt-2">
                    <Badge variant="info">
                      {session.operator.role}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-[1.35rem] border border-white/60 bg-white/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Report date</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{formattedDate}</div>
                </div>
              </div>
            </div>
          </header>
          <div className="px-6 py-8 lg:px-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
