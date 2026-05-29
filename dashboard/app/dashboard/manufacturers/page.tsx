"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { Manufacturer } from "@/types/business";

export default function ManufacturersPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);

  useEffect(() => {
    void businessService.manufacturers().then(setManufacturers);
  }, []);

  return (
    <>
      <PageHeader title="Constructeurs" description="Matrice Buy Back par constructeur." />
      <DataTable
        data={manufacturers}
        emptyMessage="Aucun constructeur pour le moment."
        minWidth={860}
        columns={[
          {
            id: "name",
            header: "Constructeur",
            className: "px-4 py-3 font-medium text-gray-950",
            cell: (manufacturer) => (
              <Link href={`/dashboard/manufacturers/${manufacturer.id}/rules`}>{manufacturer.name}</Link>
            ),
            sortValue: (manufacturer) => manufacturer.name,
            searchValue: (manufacturer) => manufacturer.name,
          },
          {
            id: "constructorAllowanceAmount",
            header: "Franchise constructeur",
            cell: (manufacturer) => formatMoney(manufacturer.rule?.constructorAllowanceAmount),
            sortValue: (manufacturer) => Number(manufacturer.rule?.constructorAllowanceAmount ?? 0),
            searchValue: (manufacturer) => manufacturer.rule?.constructorAllowanceAmount,
          },
          {
            id: "laborRate",
            header: "Taux horaire",
            cell: (manufacturer) => formatMoney(manufacturer.rule?.laborRate),
            sortValue: (manufacturer) => Number(manufacturer.rule?.laborRate ?? 0),
            searchValue: (manufacturer) => manufacturer.rule?.laborRate,
          },
          {
            id: "revisionRequired",
            header: "Revision",
            cell: (manufacturer) => (
              <Badge variant={manufacturer.rule?.revisionRequired ? "warning" : "outline"}>
                {manufacturer.rule?.revisionRequired ? "Obligatoire" : "Non"}
              </Badge>
            ),
            sortValue: (manufacturer) => (manufacturer.rule?.revisionRequired ? 1 : 0),
            searchValue: (manufacturer) => (manufacturer.rule?.revisionRequired ? "Obligatoire" : "Non"),
          },
          {
            id: "repairRules",
            header: "Regles",
            cell: (manufacturer) => manufacturer._count?.repairRules ?? 0,
            sortValue: (manufacturer) => manufacturer._count?.repairRules ?? 0,
            searchValue: (manufacturer) => manufacturer._count?.repairRules ?? 0,
          },
        ]}
      />
    </>
  );
}
