"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { businessService } from "@/services/business.service";
import { Agency } from "@/types/business";

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);

  useEffect(() => {
    void businessService.agencies().then(setAgencies);
  }, []);

  return (
    <>
      <PageHeader title="Agences" description="Referentiel des villes et agences de controle." />
      <DataTable
        data={agencies}
        emptyMessage="Aucune agence pour le moment."
        minWidth={560}
        columns={[
          {
            id: "name",
            header: "Agence",
            className: "px-4 py-3 font-medium text-gray-950",
            cell: (agency) => agency.name,
            sortValue: (agency) => agency.name,
            searchValue: (agency) => agency.name,
          },
          {
            id: "city",
            header: "Ville",
            cell: (agency) => agency.city,
            sortValue: (agency) => agency.city,
            searchValue: (agency) => agency.city,
          },
        ]}
      />
    </>
  );
}
