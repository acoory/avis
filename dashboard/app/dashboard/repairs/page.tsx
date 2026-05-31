import { PageHeader } from "@/components/dashboard/page-header";
import { DataTablePlaceholder } from "@/components/dashboard/data-table-placeholder";

export default function RepairsPage() {
  return (
    <>
      <PageHeader title="Reparations" description="Placeholder pour le futur suivi des reparations." />
      <DataTablePlaceholder columns={["Vehicule", "Type", "Economie reference", "Statut"]} title="Reparations" />
    </>
  );
}
