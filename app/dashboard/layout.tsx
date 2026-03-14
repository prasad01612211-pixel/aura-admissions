import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Badge } from "@/components/ui/badge";
import { isSupabaseConfigured } from "@/lib/env";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-[1600px]">
        <DashboardSidebar />
        <main className="min-h-screen flex-1">
          <header className="border-b border-slate-200 bg-white/80 px-6 py-5 backdrop-blur lg:px-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm text-slate-500">Admissions operations</div>
                <h1 className="text-2xl font-semibold text-slate-950">Production operations console</h1>
              </div>
              <Badge variant={isSupabaseConfigured ? "success" : "accent"}>
                {isSupabaseConfigured ? "Supabase connected" : "Local fallback active"}
              </Badge>
            </div>
          </header>
          <div className="px-6 py-8 lg:px-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
