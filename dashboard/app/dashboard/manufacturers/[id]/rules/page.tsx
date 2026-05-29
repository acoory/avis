"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { Manufacturer } from "@/types/business";

export default function ManufacturerRulesPage() {
  const params = useParams<{ id: string }>();
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);

  useEffect(() => {
    void businessService.manufacturers().then((manufacturers) => {
      setManufacturer(manufacturers.find((item) => item.id === params.id) ?? null);
    });
  }, [params.id]);

  return (
    <>
      <PageHeader
        title={manufacturer?.name ?? "Regles constructeur"}
        description="Resume de la matrice Buy Back. Edition admin a venir."
      />
      <Card>
        <CardHeader>
          <CardTitle>Regles generales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Rule label="Franchise constructeur" value={formatMoney(manufacturer?.rule?.constructorAllowanceAmount)} />
          <Rule label="Taux horaire" value={formatMoney(manufacturer?.rule?.laborRate)} />
          <Rule label="Taux peinture" value={formatMoney(manufacturer?.rule?.paintRate)} />
          <Rule label="Cout revision" value={formatMoney(manufacturer?.rule?.servicingCost)} />
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Revision</p>
            <Badge className="mt-2" variant={manufacturer?.rule?.revisionRequired ? "warning" : "outline"}>
              {manufacturer?.rule?.revisionRequired ? "Obligatoire" : "Non obligatoire"}
            </Badge>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="text-xs font-medium uppercase text-gray-500">Notes</p>
            <p className="mt-2 text-sm text-gray-700">{manufacturer?.rule?.notes ?? "-"}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-gray-950">{value}</p>
    </div>
  );
}
