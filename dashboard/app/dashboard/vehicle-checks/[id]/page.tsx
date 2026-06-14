"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { VehicleCheckActions } from "@/components/business/vehicle-check-actions";
import { VehicleCheckStatusBadge } from "@/components/business/decision-badge";
import { RepairItemsTable, VehicleCheckTable } from "@/components/business/vehicle-check-table";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatLicensePlate, formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { VehicleCheck, VehicleCheckItem } from "@/types/business";

export default function VehicleCheckDetailsPage() {
  const params = useParams<{ id: string }>();
  const [vehicleCheck, setVehicleCheck] = useState<VehicleCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void businessService
      .vehicleCheck(params.id)
      .then(setVehicleCheck)
      .finally(() => setIsLoading(false));
  }, [params.id]);

  function handlePartOrderUpdated(updatedItem: VehicleCheckItem) {
    updateItem(updatedItem);
  }

  function handleOperationalStatusUpdated(updatedItem: VehicleCheckItem) {
    updateItem(updatedItem);
    void businessService.vehicleCheck(params.id).then(setVehicleCheck);
  }

  function updateItem(updatedItem: VehicleCheckItem) {
    setVehicleCheck((current) =>
      current
        ? {
            ...current,
            items: current.items?.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
          }
        : current,
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!vehicleCheck) {
    return <PageHeader title="Controle introuvable" description="Impossible de charger ce controle." />;
  }

  return (
    <>
      <div className="mb-4">
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/vehicle-checks">
            <ChevronLeft className="h-4 w-4" />
            Retour aux controles
          </Link>
        </Button>
      </div>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <PageHeader
            title={vehicleCheck.checkNumber}
            description={`${formatLicensePlate(
              vehicleCheck.licensePlate,
              vehicleCheck.licensePlateCountry,
              vehicleCheck.licensePlateRaw,
            )} | ${vehicleCheck.manufacturer?.name ?? "-"} | ${formatDate(vehicleCheck.checkDate)}`}
          />
          <VehicleCheckStatusBadge status={vehicleCheck.status} />
        </div>
        <VehicleCheckActions vehicleCheck={vehicleCheck} onCompleted={setVehicleCheck} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Economie reference</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-teal-700">
            {formatMoney(vehicleCheck.totalInternalSavingAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Franchise</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-gray-950">
            {formatMoney(vehicleCheck.constructorAllowanceAmount)}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <RepairItemsTable
          vehicleCheck={vehicleCheck}
          onOperationalStatusUpdated={handleOperationalStatusUpdated}
          onPartOrderUpdated={handlePartOrderUpdated}
        />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Observations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Resume decision</p>
            <p className="mt-2">{vehicleCheck.decisionSummary ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Commentaire controle</p>
            <p className="mt-2 whitespace-pre-wrap">{vehicleCheck.notes?.trim() ? vehicleCheck.notes : "-"}</p>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6">
        <VehicleCheckTable vehicleChecks={[vehicleCheck]} />
      </div>
    </>
  );
}
