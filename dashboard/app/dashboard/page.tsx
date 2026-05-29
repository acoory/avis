"use client";

import { AlertTriangle, Car, ClipboardCheck, Euro } from "lucide-react";
import { useEffect, useState } from "react";
import { ExportButton } from "@/components/business/export-button";
import { VehicleCheckTable } from "@/components/business/vehicle-check-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { DashboardSummary } from "@/types/business";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [byManufacturer, setByManufacturer] = useState<
    Array<{ manufacturerName: string; totalInternalSavingAmount: string; vehicleChecksCount: number }>
  >([]);

  useEffect(() => {
    void Promise.all([businessService.dashboardSummary(), businessService.savingsByManufacturer()]).then(
      ([summaryData, manufacturerData]) => {
        setSummary(summaryData);
        setByManufacturer(manufacturerData);
      },
    );
  }, []);

  return (
    <>
      <PageHeader
        title="Buy Back"
        description="Pilotage des controles, economies internes et alertes constructeur."
      />
      <div className="mb-4 flex justify-end">
        <ExportButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard description="Tous statuts" icon={Car} title="Vehicules controles" value={`${summary?.vehicleChecksCount ?? 0}`} />
        <StatCard description="Controles finalises" icon={ClipboardCheck} title="Completes" value={`${summary?.completedVehicleChecksCount ?? 0}`} />
        <StatCard description="Gain estime" icon={Euro} title="Economies" value={formatMoney(summary?.totalInternalSavingAmount)} />
        <StatCard description="A traiter" icon={AlertTriangle} title="Alertes" value={`${summary?.alertItemsCount ?? 0}`} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-950">Controles recents</h2>
          <VehicleCheckTable vehicleChecks={summary?.recentVehicleChecks ?? []} />
        </div>
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
      </div>
    </>
  );
}
