import { ReadylineBrand } from "@/components/branding/readyline-brand";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const appVersion = process.env.NEXT_PUBLIC_APP_DISPLAY_VERSION ?? "0.1.0";
  const buildDate = process.env.NEXT_PUBLIC_APP_BUILD_DATE;
  const formattedBuildDate = buildDate
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(buildDate))
    : null;

  return (
    <>
      <PageHeader title="Paramètres" description="Informations générales de l’application." />
      <Card>
        <CardHeader>
          <CardTitle>À propos de Readyline</CardTitle>
          <CardDescription>Identité et version actuellement installée.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ReadylineBrand />
          <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-gray-500">Version</dt>
              <dd className="text-sm font-medium text-gray-950">v{appVersion}</dd>
            </div>
            {formattedBuildDate ? (
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-gray-500">Publication</dt>
                <dd className="text-right text-sm font-medium text-gray-950">
                  {formattedBuildDate}
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-gray-500">Mises à jour</dt>
              <dd className="text-sm font-medium text-teal-700">Automatiques</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-gray-500">Installation</dt>
              <dd className="text-right text-sm font-medium text-gray-950">
                Web, iPhone et Android
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </>
  );
}
