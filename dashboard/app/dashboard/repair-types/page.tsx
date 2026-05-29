"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { RepairType } from "@/types/business";

export default function RepairTypesPage() {
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([]);

  useEffect(() => {
    void businessService.repairTypes().then(setRepairTypes);
  }, []);

  return (
    <>
      <PageHeader title="Types de reparations" description="Montants internes de reference utilises par le moteur." />
      <DataTable
        data={repairTypes}
        emptyMessage="Aucun type de reparation pour le moment."
        minWidth={820}
        columns={[
          {
            id: "code",
            header: "Code",
            className: "px-4 py-3 font-mono text-xs text-gray-600",
            cell: (repairType) => repairType.code,
            sortValue: (repairType) => repairType.code,
            searchValue: (repairType) => repairType.code,
          },
          {
            id: "name",
            header: "Type",
            className: "px-4 py-3 font-medium text-gray-950",
            cell: (repairType) => repairType.name,
            sortValue: (repairType) => repairType.name,
            searchValue: (repairType) => repairType.name,
          },
          {
            id: "defaultInternalSavingAmount",
            header: "Economie reference",
            cell: (repairType) => formatMoney(repairType.defaultInternalSavingAmount),
            sortValue: (repairType) => Number(repairType.defaultInternalSavingAmount),
            searchValue: (repairType) => repairType.defaultInternalSavingAmount,
          },
          {
            id: "defaultInternalCost",
            header: "Cout interne",
            cell: (repairType) => formatMoney(repairType.defaultInternalCost),
            sortValue: (repairType) => Number(repairType.defaultInternalCost),
            searchValue: (repairType) => repairType.defaultInternalCost,
          },
          {
            id: "isActive",
            header: "Statut",
            cell: (repairType) => (
              <Badge variant={repairType.isActive ? "success" : "outline"}>
                {repairType.isActive ? "Actif" : "Inactif"}
              </Badge>
            ),
            sortValue: (repairType) => (repairType.isActive ? 1 : 0),
            searchValue: (repairType) => (repairType.isActive ? "Actif" : "Inactif"),
          },
        ]}
      />
    </>
  );
}
