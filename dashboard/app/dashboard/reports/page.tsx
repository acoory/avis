"use client";

import { ExportButton } from "@/components/business/export-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Rapports" description="Exports et syntheses Buy Back." />
      <Card>
        <CardHeader>
          <CardTitle>Synthese Excel</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">Export des controles au format proche du tableau Excel actuel.</p>
          <ExportButton />
        </CardContent>
      </Card>
    </>
  );
}
