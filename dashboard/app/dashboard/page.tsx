"use client";

import { AlertTriangle, Car, ClipboardCheck, Euro, PackageCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ExportButton } from "@/components/business/export-button";
import { VehicleCheckTable } from "@/components/business/vehicle-check-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { useAuthStore } from "@/stores/auth.store";
import { DashboardSummary } from "@/types/business";

type CollaboratorSaving = {
  collaboratorId: string;
  collaboratorName: string;
  collaboratorEmail: string | null;
  totalInternalSavingAmount: string;
  vehicleChecksCount: number;
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isManager = user?.role === "MANAGER";
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [dateFrom, setDateFrom] = useState(defaultPeriod.dateFrom);
  const [dateTo, setDateTo] = useState(defaultPeriod.dateTo);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [byManufacturer, setByManufacturer] = useState<
    Array<{ manufacturerName: string; totalInternalSavingAmount: string; vehicleChecksCount: number }>
  >([]);
  const [byCollaborator, setByCollaborator] = useState<CollaboratorSaving[]>([]);

  useEffect(() => {
    const params = {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    void Promise.all([
      businessService.dashboardSummary(params),
      businessService.savingsByManufacturer(params),
      businessService.savingsByCollaborator(params),
    ]).then(
      ([summaryData, manufacturerData, collaboratorData]) => {
        setSummary(summaryData);
        setByManufacturer(manufacturerData);
        setByCollaborator(collaboratorData);
      },
    );
  }, [dateFrom, dateTo]);

  const pageTitle = isManager ? "Accueil manager" : "Buy Back";
  const pageDescription = isManager
    ? "Suivi de ton equipe, des economies et des commandes pieces a lancer."
    : "Pilotage des controles, economies internes et alertes constructeur.";

  return (
    <>
      <PageHeader title={pageTitle} description={pageDescription} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Card className="lg:w-fit">
          <CardContent className="grid gap-3 p-3 sm:grid-cols-[180px_180px_auto] sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Debut periode</label>
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Fin periode</label>
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
            <button
              className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              type="button"
              onClick={() => {
                setDateFrom(defaultPeriod.dateFrom);
                setDateTo(defaultPeriod.dateTo);
              }}
            >
              30 derniers jours
            </button>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard description="Tous statuts" icon={Car} title="Vehicules controles" value={`${summary?.vehicleChecksCount ?? 0}`} />
        <StatCard description="Controles finalises" icon={ClipboardCheck} title="Completes" value={`${summary?.completedVehicleChecksCount ?? 0}`} />
        <StatCard description="Gain estime" icon={Euro} title="Economies" value={formatMoney(summary?.totalInternalSavingAmount)} />
        <StatCard description="A traiter" icon={AlertTriangle} title="Alertes" value={`${summary?.alertItemsCount ?? 0}`} />
        <StatCard description="Pieces a commander" icon={PackageCheck} title="Commandes" value={`${summary?.partOrdersToPlaceCount ?? 0}`} />
      </div>

      <div className="mt-6 min-w-0">
        <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-gray-950">
              {isManager ? "Controles recents de l'equipe" : "Controles recents"}
            </h2>
            <ExportButton
              dateRange={{ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }}
              withCollaboratorFilter
            />
          </div>
          <VehicleCheckTable vehicleChecks={summary?.recentVehicleChecks ?? []} />
        </div>
        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Economies par constructeur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byManufacturer.map((row) => (
                <div className="flex items-center justify-between gap-3" key={row.manufacturerName}>
                  <div>
                    <p className="text-sm font-medium text-gray-950">{row.manufacturerName}</p>
                    <p className="text-xs text-gray-500">{row.vehicleChecksCount} controle(s)</p>
                  </div>
                  <p className="text-sm font-semibold text-teal-700">
                    {formatMoney(row.totalInternalSavingAmount)}
                  </p>
                </div>
              ))}
              {!byManufacturer.length ? <p className="text-sm text-gray-500">Aucune donnee pour le moment.</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-700" />
                Statistiques collaborateurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byCollaborator.map((row) => (
                <div className="flex items-center justify-between gap-3" key={row.collaboratorId}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-950">{row.collaboratorName}</p>
                    <p className="text-xs text-gray-500">{row.vehicleChecksCount} controle(s)</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-teal-700">
                    {formatMoney(row.totalInternalSavingAmount)}
                  </p>
                </div>
              ))}
              {!byCollaborator.length ? <p className="text-sm text-gray-500">Aucune donnee pour le moment.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function getDefaultPeriod() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 30);

  return {
    dateFrom: toInputDate(start),
    dateTo: toInputDate(today),
  };
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
