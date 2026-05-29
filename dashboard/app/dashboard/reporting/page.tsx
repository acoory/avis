import { PageHeader } from "@/components/dashboard/page-header";
import { DataTablePlaceholder } from "@/components/dashboard/data-table-placeholder";

export default function ReportingPage() {
  return (
    <>
      <PageHeader title="Reporting" description="Placeholder pour les exports Excel et rapports." />
      <DataTablePlaceholder columns={["Rapport", "Periode", "Format", "Statut"]} title="Reporting" />
    </>
  );
}
