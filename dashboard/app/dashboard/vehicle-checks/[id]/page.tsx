"use client";

import Link from "next/link";
import { Building2, CalendarDays, Car, ChevronLeft, MapPin, UserRound, Wrench } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { VehicleCheckActions } from "@/components/business/vehicle-check-actions";
import { VehicleCheckStatusBadge } from "@/components/business/decision-badge";
import { RepairItemsTable } from "@/components/business/vehicle-check-table";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const formattedLicensePlate = formatLicensePlate(
    vehicleCheck.licensePlate,
    vehicleCheck.licensePlateCountry,
    vehicleCheck.licensePlateRaw,
  );
  const collaboratorName = vehicleCheck.collaborator
    ? `${vehicleCheck.collaborator.firstName} ${vehicleCheck.collaborator.lastName}`
    : "-";
  const repairCount = vehicleCheck.items?.length ?? 0;
  const hasObservations = Boolean(vehicleCheck.decisionSummary?.trim() || vehicleCheck.notes?.trim());

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/vehicle-checks">
            <ChevronLeft className="h-4 w-4" />
            Retour aux controles
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-950">{vehicleCheck.checkNumber}</h1>
            <VehicleCheckStatusBadge status={vehicleCheck.status} />
          </div>
          <p className="mt-3 text-xl font-semibold text-teal-700">{formattedLicensePlate}</p>
          <p className="mt-1 text-sm text-gray-600">
            {vehicleCheck.manufacturer?.name ?? "Constructeur non precise"}
            {vehicleCheck.vehicleModel?.name ? ` · ${vehicleCheck.vehicleModel.name}` : ""}
          </p>
        </div>
        <VehicleCheckActions vehicleCheck={vehicleCheck} onCompleted={setVehicleCheck} />
      </div>

      <Card>
        <CardContent className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem icon={CalendarDays} label="Date du controle" value={formatDate(vehicleCheck.checkDate)} />
          <DetailItem icon={Building2} label="Agence" value={vehicleCheck.agency?.name ?? "-"} />
          <DetailItem icon={MapPin} label="Ville" value={vehicleCheck.city || "-"} />
          <DetailItem icon={UserRound} label="Controle par" value={collaboratorName} />
        </CardContent>
        <div className="grid border-t border-gray-200 sm:grid-cols-3">
          <Metric
            className="text-teal-700"
            label="Economie reference"
            value={formatMoney(vehicleCheck.totalInternalSavingAmount)}
          />
          <Metric label="Franchise constructeur" value={formatMoney(vehicleCheck.constructorAllowanceAmount)} />
          <Metric label="Reparations observees" value={repairCount.toString()} />
        </div>
      </Card>

      {hasObservations ? (
        <Card className="mt-5">
          <CardContent className="grid gap-5 p-5 lg:grid-cols-2">
            {vehicleCheck.decisionSummary?.trim() ? (
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Synthese de la decision</p>
                <p className="mt-2 text-sm leading-6 text-gray-700">{vehicleCheck.decisionSummary}</p>
              </div>
            ) : null}
            {vehicleCheck.notes?.trim() ? (
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Commentaire du controle</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{vehicleCheck.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <Wrench className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Reparations observees</h2>
            <p className="text-sm text-gray-500">
              {repairCount
                ? `${repairCount} reparation${repairCount > 1 ? "s" : ""} · Cliquez sur une ligne pour la mettre a jour.`
                : "Aucune reparation renseignee."}
            </p>
          </div>
        </div>
        <RepairItemsTable
          vehicleCheck={vehicleCheck}
          onOperationalStatusUpdated={handleOperationalStatusUpdated}
          onPartOrderUpdated={handlePartOrderUpdated}
        />
      </section>
    </>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Car;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-gray-950" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Metric({
  className = "text-gray-950",
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-gray-200 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${className}`}>{value}</p>
    </div>
  );
}
