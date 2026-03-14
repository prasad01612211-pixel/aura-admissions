import { SetupWizard } from "@/components/setup/setup-wizard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSetupWizardSnapshot } from "@/lib/operations/setup";

export default async function SetupPage() {
  const snapshot = await getSetupWizardSnapshot();

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardDescription>Admin setup wizard</CardDescription>
          <CardTitle>Structured institution onboarding and publish readiness</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Use this wizard to configure structured institution, branch, program, fee, trust, commission, and WhatsApp settings.
        </CardContent>
      </Card>

      <SetupWizard snapshot={snapshot} />
    </div>
  );
}
