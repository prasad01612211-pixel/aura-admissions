import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCampaignAnalyticsSnapshot } from "@/lib/data/analytics";

export default async function CampaignAnalyticsPage() {
  const snapshot = await getCampaignAnalyticsSnapshot();

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardDescription>Campaign analytics</CardDescription>
          <CardTitle>{snapshot.source_label}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Campaign</th>
                <th className="pb-3 font-medium">Target</th>
                <th className="pb-3 font-medium">Replies</th>
                <th className="pb-3 font-medium">Qualified</th>
                <th className="pb-3 font-medium">Paid</th>
                <th className="pb-3 font-medium">Won</th>
                <th className="pb-3 font-medium">Rates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {snapshot.rows.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="py-4">
                    <div className="font-medium text-slate-950">{campaign.name}</div>
                    <div className="text-slate-500">{campaign.template_name}</div>
                  </td>
                  <td className="py-4 text-slate-600">{campaign.target_count.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">
                    {campaign.reply_count.toLocaleString()}
                    <div className="text-xs text-slate-400">{campaign.reply_rate}%</div>
                  </td>
                  <td className="py-4 text-slate-600">
                    {campaign.qualified_count.toLocaleString()}
                    <div className="text-xs text-slate-400">{campaign.qualification_rate}%</div>
                  </td>
                  <td className="py-4 text-slate-600">
                    {campaign.payment_count.toLocaleString()}
                    <div className="text-xs text-slate-400">{campaign.payment_rate}%</div>
                  </td>
                  <td className="py-4 text-slate-600">
                    {campaign.admission_count.toLocaleString()}
                    <div className="text-xs text-slate-400">{campaign.admission_rate}%</div>
                  </td>
                  <td className="py-4 text-slate-600">
                    <div>Hot leads: {campaign.hot_leads.toLocaleString()}</div>
                    <div>Pending payments: {campaign.pending_payments.toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {snapshot.rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No campaigns are available yet.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
