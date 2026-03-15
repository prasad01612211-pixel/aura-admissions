import { CheckSquare, Clock3, Siren, TimerReset } from "lucide-react";

import { DashboardPageIntro, DashboardSummaryStat } from "@/components/dashboard/page-intro";
import { TaskBoard } from "@/components/dashboard/task-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTaskQueueSnapshot } from "@/lib/data/tasks";

export default async function TaskQueuePage() {
  const snapshot = await getTaskQueueSnapshot();

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Task command"
        badge="Human follow-up"
        icon={CheckSquare}
        title="Counselor and ops execution in one disciplined queue."
        description="Keep callbacks, visit coordination, payment recovery, and closure work visible in one place so the team can move quickly without losing accountability."
        stats={[
          { label: "Open tasks", value: snapshot.open_count.toLocaleString(), helper: "All active follow-up work still in motion." },
          { label: "Urgent queue", value: snapshot.urgent_count.toLocaleString(), helper: "Tasks that need immediate intervention." },
          { label: "Overdue", value: snapshot.overdue_count.toLocaleString(), helper: "Work that is already behind SLA." },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardSummaryStat label="Open tasks" value={snapshot.open_count.toLocaleString()} helper="Visible queue across callbacks, visits, and payment recovery." />
        <DashboardSummaryStat label="Urgent queue" value={snapshot.urgent_count.toLocaleString()} helper="The fastest path to restoring counselor focus." />
        <DashboardSummaryStat label="Overdue" value={snapshot.overdue_count.toLocaleString()} helper="Signals where follow-up discipline needs correction." />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardDescription>Human follow-up queue</CardDescription>
              <CardTitle>Tasks across callbacks, visits, and payment recovery</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-3 py-2 text-sm text-teal-800">
                <Clock3 className="h-4 w-4" />
                Live queue
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(179,132,67,0.22)] bg-[rgba(179,132,67,0.08)] px-3 py-2 text-sm text-[rgb(120,83,34)]">
                <Siren className="h-4 w-4" />
                Priority visible
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700">
                <TimerReset className="h-4 w-4" />
                Refresh on update
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {snapshot.items.length > 0 ? (
            <TaskBoard snapshot={snapshot} />
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">No tasks are queued yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
