import { VisitBoard } from "@/components/dashboard/visit-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { branches } from "@/lib/fixtures/demo-data";
import { getVisitMetricsSnapshot } from "@/lib/data/visits";

export default async function VisitsPage() {
  const snapshot = await getVisitMetricsSnapshot();
  const branchNames = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]));

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <CardDescription>Total visits</CardDescription>
            <CardTitle>{snapshot.total.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Confirmed</CardDescription>
            <CardTitle>{snapshot.confirmed.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completed</CardDescription>
            <CardTitle>{snapshot.completed.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>No show</CardDescription>
            <CardTitle>{snapshot.no_show.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Converted</CardDescription>
            <CardTitle>{snapshot.converted.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Visit scheduling</CardDescription>
          <CardTitle>{snapshot.source_label}</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.rows.length > 0 ? (
            <VisitBoard rows={snapshot.rows} branchNames={branchNames} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No visit bookings are available yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
