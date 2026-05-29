import { PageHeader } from "@/components/dashboard/page-header";
import { DataTablePlaceholder } from "@/components/dashboard/data-table-placeholder";

export default function InspectionsPage() {
  return (
    <>
      <PageHeader title="Controles" description="Placeholder pour le futur module de controle." />
      <DataTablePlaceholder columns={["Vehicule", "Controleur", "Statut", "Date"]} title="Controles" />
    </>
  );
}
