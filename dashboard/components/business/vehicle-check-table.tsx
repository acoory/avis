import Link from "next/link";
import { DecisionBadge, VehicleCheckStatusBadge } from "@/components/business/decision-badge";
import { DataTable } from "@/components/dashboard/data-table";
import { formatDate, formatLicensePlate, formatMoney } from "@/lib/format";
import { VehicleCheck } from "@/types/business";

type VehicleCheckTableProps = {
  vehicleChecks: VehicleCheck[];
  onDateFilterChange?: (range: { dateFrom?: string; dateTo?: string }) => void;
};

export function VehicleCheckTable({ vehicleChecks, onDateFilterChange }: VehicleCheckTableProps) {
  return (
    <DataTable
      data={vehicleChecks}
      dateFilter={{
        label: "Date",
        getValue: (check) => check.checkDate,
        mode: onDateFilterChange ? "server" : "client",
        onChange: onDateFilterChange,
      }}
      emptyMessage="Aucun controle pour le moment."
      minWidth={1080}
      columns={[
        {
          id: "checkNumber",
          header: "Numero",
          className: "px-4 py-3 font-medium text-gray-950",
          cell: (check) => <Link href={`/dashboard/vehicle-checks/${check.id}`}>{check.checkNumber}</Link>,
          sortValue: (check) => check.checkNumber,
          searchValue: (check) => check.checkNumber,
        },
        {
          id: "checkDate",
          header: "Date",
          cell: (check) => formatDate(check.checkDate),
          sortValue: (check) => new Date(check.checkDate),
          searchValue: (check) => formatDate(check.checkDate),
        },
        {
          id: "licensePlate",
          header: "Vehicule",
          cell: (check) => formatLicensePlate(check.licensePlate),
          sortValue: (check) => check.licensePlate,
          searchValue: (check) => `${check.licensePlate} ${formatLicensePlate(check.licensePlate)}`,
        },
        {
          id: "manufacturer",
          header: "Constructeur",
          cell: (check) => check.manufacturer?.name ?? "-",
          sortValue: (check) => check.manufacturer?.name,
          searchValue: (check) => check.manufacturer?.name,
        },
        {
          id: "city",
          header: "Ville",
          cell: (check) => check.city,
          sortValue: (check) => check.city,
          searchValue: (check) => check.city,
        },
        {
          id: "totalInternalSavingAmount",
          header: "Economie",
          cell: (check) => formatMoney(check.totalInternalSavingAmount),
          sortValue: (check) => Number(check.totalInternalSavingAmount),
          searchValue: (check) => check.totalInternalSavingAmount,
        },
        {
          id: "totalInternalCost",
          header: "Cout interne",
          cell: (check) => formatMoney(check.totalInternalCost),
          sortValue: (check) => Number(check.totalInternalCost),
          searchValue: (check) => check.totalInternalCost,
        },
        {
          id: "status",
          header: "Statut",
          cell: (check) => <VehicleCheckStatusBadge status={check.status} />,
          sortValue: (check) => check.status,
          searchValue: (check) => check.status,
        },
      ]}
    />
  );
}

export function RepairItemsTable({ vehicleCheck }: { vehicleCheck: VehicleCheck }) {
  return (
    <DataTable
      data={vehicleCheck.items ?? []}
      emptyMessage="Aucune reparation sur ce controle."
      minWidth={980}
      columns={[
        {
          id: "repairType",
          header: "Reparation",
          className: "px-4 py-3 font-medium text-gray-950",
          cell: (item) => item.repairType.name,
          sortValue: (item) => item.repairType.name,
          searchValue: (item) => item.repairType.name,
        },
        {
          id: "quantity",
          header: "Quantite",
          cell: (item) => item.quantity,
          sortValue: (item) => item.quantity,
          searchValue: (item) => item.quantity,
        },
        {
          id: "decisionStatus",
          header: "Decision",
          cell: (item) => <DecisionBadge status={item.decisionStatus} />,
          sortValue: (item) => item.decisionStatus,
          searchValue: (item) => item.decisionStatus,
        },
        {
          id: "decisionMessage",
          header: "Message",
          cell: (item) => item.decisionMessage ?? "-",
          sortValue: (item) => item.decisionMessage,
          searchValue: (item) => item.decisionMessage,
        },
        {
          id: "comment",
          header: "Commentaire",
          cell: (item) => (item.comment?.trim() ? item.comment : "-"),
          sortValue: (item) => item.comment,
          searchValue: (item) => item.comment,
        },
      ]}
    />
  );
}
