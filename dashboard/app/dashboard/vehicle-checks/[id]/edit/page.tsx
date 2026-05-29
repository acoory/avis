"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { VehicleCheckForm } from "@/components/business/vehicle-check-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLicensePlate } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

export default function EditVehicleCheckPage() {
  const params = useParams<{ id: string }>();
  const [vehicleCheck, setVehicleCheck] = useState<VehicleCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void businessService
      .vehicleCheck(params.id)
      .then(setVehicleCheck)
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) {
    return <PageHeader title="Modifier le controle" description="Chargement du brouillon..." />;
  }

  if (!vehicleCheck) {
    return <PageHeader title="Controle introuvable" description="Impossible de charger ce controle." />;
  }

  if (vehicleCheck.status === "COMPLETED") {
    return (
      <>
        <PageHeader title="Controle complete" description="Un controle complete ne peut plus etre modifie." />
        <Card>
          <CardHeader>
            <CardTitle>{vehicleCheck.checkNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/dashboard/vehicle-checks/${vehicleCheck.id}`}>Retour au controle</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Modifier le controle"
        description={`${vehicleCheck.checkNumber} | ${formatLicensePlate(vehicleCheck.licensePlate)}`}
      />
      <VehicleCheckForm initialVehicleCheck={vehicleCheck} />
    </>
  );
}
