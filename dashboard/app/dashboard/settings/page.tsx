import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Parametres" description="Configuration generale de l'application." />
      <Card>
        <CardHeader>
          <CardTitle>Parametres applicatifs</CardTitle>
          <CardDescription>Les preferences et politiques d&apos;acces seront ajoutees dans une phase suivante.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Aucune configuration metier n&apos;est exposee dans cette V1.</p>
        </CardContent>
      </Card>
    </>
  );
}
