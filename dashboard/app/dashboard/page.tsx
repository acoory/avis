"use client";

import { AlertTriangle, Car, ClipboardCheck, Euro, PackageCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExportButton } from "@/components/business/export-button";
import { VehicleCheckTable } from "@/components/business/vehicle-check-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { useAuthStore } from "@/stores/auth.store";
import { DashboardSummary, VehicleCheck } from "@/types/business";

type CollaboratorSaving = {
  collaboratorId: string;
  collaboratorName: string;
  collaboratorEmail: string | null;
  totalInternalSavingAmount: string;
  totalInternalCost: string;
  vehicleChecksCount: number;
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isManager = user?.role === "MANAGER";
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [dateFrom, setDateFrom] = useState(defaultPeriod.dateFrom);
  const [dateTo, setDateTo] = useState(defaultPeriod.dateTo);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [teamVehicleChecks, setTeamVehicleChecks] = useState<VehicleCheck[]>([]);
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
      businessService.vehicleChecks(params),
    ]).then(
      ([summaryData, manufacturerData, collaboratorData, vehicleChecksData]) => {
        setSummary(summaryData);
        setByManufacturer(manufacturerData);
        setByCollaborator(collaboratorData);
        setTeamVehicleChecks(vehicleChecksData);
      },
    );
  }, [dateFrom, dateTo]);

  const partOrdersByCollaborator = useMemo(() => {
    const grouped = new Map<
      string,
      {
        collaboratorName: string;
        collaboratorEmail: string;
        itemsCount: number;
        checksCount: number;
        estimatedAmount: number;
      }
    >();

    for (const check of teamVehicleChecks) {
      const itemsToOrder = check.items?.filter((item) => item.partOrderStatus === "TO_ORDER") ?? [];
      if (!itemsToOrder.length) {
        continue;
      }

      const collaboratorName = check.collaborator
        ? `${check.collaborator.firstName} ${check.collaborator.lastName}`
        : "Collaborateur inconnu";
      const collaboratorEmail = check.collaborator?.email ?? "";
      const key = collaboratorEmail || collaboratorName;
      const current = grouped.get(key) ?? {
        collaboratorName,
        collaboratorEmail,
        itemsCount: 0,
        checksCount: 0,
        estimatedAmount: 0,
      };

      current.itemsCount += itemsToOrder.length;
      current.checksCount += 1;
      current.estimatedAmount += itemsToOrder.reduce(
        (total, item) => total + Number(item.partOrderPrice ?? item.repairType.defaultInternalCost ?? 0),
        0,
      );
      grouped.set(key, current);
    }

    return [...grouped.values()].sort((first, second) => second.itemsCount - first.itemsCount);
  }, [teamVehicleChecks]);

  const collaboratorChartData = useMemo(
    () =>
      byCollaborator.map((row) => ({
        name: row.collaboratorName,
        controles: row.vehicleChecksCount,
        economies: Number(row.totalInternalSavingAmount),
        coutInterne: Number(row.totalInternalCost),
      })),
    [byCollaborator],
  );

  const partOrdersChartData = useMemo(
    () =>
      partOrdersByCollaborator.map((row) => ({
        name: row.collaboratorName,
        pieces: row.itemsCount,
        controles: row.checksCount,
      })),
    [partOrdersByCollaborator],
  );

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
        <ExportButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard description="Tous statuts" icon={Car} title="Vehicules controles" value={`${summary?.vehicleChecksCount ?? 0}`} />
        <StatCard description="Controles finalises" icon={ClipboardCheck} title="Completes" value={`${summary?.completedVehicleChecksCount ?? 0}`} />
        <StatCard description="Gain estime" icon={Euro} title="Economies" value={formatMoney(summary?.totalInternalSavingAmount)} />
        <StatCard description="A traiter" icon={AlertTriangle} title="Alertes" value={`${summary?.alertItemsCount ?? 0}`} />
        <StatCard description="Pieces a commander" icon={PackageCheck} title="Commandes" value={`${summary?.partOrdersToPlaceCount ?? 0}`} />
      </div>

      {isManager ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <CardTitle>Performance par collaborateur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-72">
                {collaboratorChartData.length ? (
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={collaboratorChartData} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${Number(value).toLocaleString("fr-FR")}€`} />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "economies" || name === "coutInterne"
                            ? formatMoney(Number(value))
                            : value,
                          name === "economies"
                            ? "Economies"
                            : name === "coutInterne"
                              ? "Cout interne"
                              : "Controles",
                        ]}
                      />
                      <Bar dataKey="economies" fill="#0f766e" name="Economies" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="coutInterne" fill="#94a3b8" name="Cout interne" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Aucune donnee collaborateur pour le moment.
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-3 font-medium">Collaborateur</th>
                      <th className="py-3 font-medium">Controles</th>
                      <th className="py-3 font-medium">Economies</th>
                      <th className="py-3 font-medium">Cout interne</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {byCollaborator.map((row) => (
                      <tr key={row.collaboratorId}>
                        <td className="py-3">
                          <p className="font-medium text-gray-950">{row.collaboratorName}</p>
                          <p className="text-xs text-gray-500">{row.collaboratorEmail}</p>
                        </td>
                        <td className="py-3 text-gray-700">{row.vehicleChecksCount}</td>
                        <td className="py-3 font-semibold text-teal-700">
                          {formatMoney(row.totalInternalSavingAmount)}
                        </td>
                        <td className="py-3 text-gray-700">{formatMoney(row.totalInternalCost)}</td>
                      </tr>
                    ))}
                    {!byCollaborator.length ? (
                      <tr>
                        <td className="py-6 text-center text-gray-500" colSpan={4}>
                          Aucune donnee collaborateur pour le moment.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commandes pieces par collaborateur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-56">
                {partOrdersChartData.length ? (
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={partOrdersChartData} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value, name) => [
                          value,
                          name === "pieces" ? "Pieces a commander" : "Controles concernes",
                        ]}
                      />
                      <Bar dataKey="pieces" fill="#d97706" name="Pieces a commander" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Aucune commande piece a passer.
                  </div>
                )}
              </div>
              {partOrdersByCollaborator.map((row) => (
                <div className="rounded-md border border-gray-100 p-3" key={row.collaboratorEmail || row.collaboratorName}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-950">{row.collaboratorName}</p>
                      <p className="text-xs text-gray-500">{row.checksCount} controle(s) concerne(s)</p>
                    </div>
                    <Badge variant="warning">{row.itemsCount} piece(s)</Badge>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Montant renseigne ou estime : {formatMoney(row.estimatedAmount)}
                  </p>
                </div>
              ))}
              {!partOrdersByCollaborator.length ? (
                <p className="text-sm text-gray-500">Aucune commande piece a passer.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-950">
            {isManager ? "Controles recents de l'equipe" : "Controles recents"}
          </h2>
          <VehicleCheckTable vehicleChecks={summary?.recentVehicleChecks ?? []} />
        </div>
        <div className="space-y-4">
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
