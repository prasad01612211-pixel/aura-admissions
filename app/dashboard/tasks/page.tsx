import { TaskBoard } from "@/components/dashboard/task-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTaskQueueSnapshot } from "@/lib/data/tasks";

export default async function TaskQueuePage() {
  const snapshot = await getTaskQueueSnapshot();

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Open tasks</CardDescription>
            <CardTitle>{snapshot.open_count.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Urgent queue</CardDescription>
            <CardTitle>{snapshot.urgent_count.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Overdue</CardDescription>
            <CardTitle>{snapshot.overdue_count.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Human follow-up queue</CardDescription>
          <CardTitle>Tasks across callbacks, visits, and payment recovery</CardTitle>
        </CardHeader>
        <CardContent>{snapshot.items.length > 0 ? <TaskBoard snapshot={snapshot} /> : <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">No tasks are queued yet.</div>}</CardContent>
      </Card>
    </div>
  );
}
