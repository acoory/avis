"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { VehicleCheckForm } from "@/components/business/vehicle-check-form";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { PageHeader } from "@/components/dashboard/page-header";
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
    return <LoadingScreen />;
  }

  if (!vehicleCheck) {
    return <PageHeader title="Controle introuvable" description="Impossible de charger ce controle." />;
  }

  return (
    <>
      <PageHeader
        title="Modifier le controle"
        description={`${vehicleCheck.checkNumber} | ${formatLicensePlate(
          vehicleCheck.licensePlate,
          vehicleCheck.licensePlateCountry,
          vehicleCheck.licensePlateRaw,
        )}`}
      />
      <VehicleCheckForm initialVehicleCheck={vehicleCheck} />
    </>
  );
}
