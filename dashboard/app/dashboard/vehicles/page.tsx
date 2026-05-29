import { PageHeader } from "@/components/dashboard/page-header";
import { DataTablePlaceholder } from "@/components/dashboard/data-table-placeholder";

export default function VehiclesPage() {
  return (
    <>
      <PageHeader title="Vehicules" description="Placeholder pour le futur module vehicules." />
      <DataTablePlaceholder columns={["Immatriculation", "Modele", "Statut", "Dernier controle"]} title="Vehicules" />
    </>
  );
}
