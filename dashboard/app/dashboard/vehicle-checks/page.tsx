"use client";

import Link from "next/link";
import { CheckCircle2, ClipboardList, Euro, ListChecks, PackageCheck, Plus, Wrench, type LucideIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ExportButton } from "@/components/business/export-button";
import { VehicleCheckTable } from "@/components/business/vehicle-check-table";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { businessService, VehicleCheckListParams } from "@/services/business.service";
import { VehicleCheck, VehicleCheckListStats } from "@/types/business";

const initialStats: VehicleCheckListStats = {
  completedCount: 0,
  draftCount: 0,
  recoveredCount: 0,
  takenInChargeCount: 0,
  toAnalyzeCount: 0,
  totalCount: 0,
  totalSavingAmount: 0,
  toOrderCount: 0,
};

export default function VehicleChecksPage() {
  return (
    <Suspense fallback={<LoadingScreen fullScreen={false} />}>
      <VehicleChecksContent />
    </Suspense>
  );
}

function VehicleChecksContent() {
  const searchParams = useSearchParams();
  const [vehicleChecks, setVehicleChecks] = useState<VehicleCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ dateFrom?: string; dateTo?: string }>({});
  const [stats, setStats] = useState<VehicleCheckListStats>(initialStats);
  const [listParams, setListParams] = useState<VehicleCheckListParams>(() => getListParams(searchParams));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    void loadVehicleChecks();
  }, []);

  async function loadVehicleChecks(params: VehicleCheckListParams = listParams) {
    const nextParams = { ...listParams, ...params };
    setListParams(nextParams);
    setDateRange({ dateFrom: nextParams.dateFrom, dateTo: nextParams.dateTo });
    saveListParamsInUrl(nextParams);
    setIsLoading(true);
    try {
      const data = await businessService.vehicleChecks(nextParams);
      setVehicleChecks(data.items);
      setStats(data.stats);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setListParams((current) => ({
        ...current,
        page: data.page,
        pageSize: data.pageSize,
      }));
    } finally {
      setIsLoading(false);
    }
  }

  function handleVehicleCheckDeleted(deletedVehicleCheck: VehicleCheck) {
    setVehicleChecks((current) => current.filter((check) => check.id !== deletedVehicleCheck.id));
    void loadVehicleChecks(listParams);
  }

  function handleVehicleCheckUpdated(updatedVehicleCheck: VehicleCheck) {
    setVehicleChecks((current) => current.map((check) => (check.id === updatedVehicleCheck.id ? updatedVehicleCheck : check)));
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="Controles Buy Back" description="Liste des controles vehicules et decisions metier." />
        <div className="flex gap-2">
          <ExportButton dateRange={dateRange} withCollaboratorFilter />
          <Button asChild>
            <Link href="/dashboard/vehicle-checks/new">
              <Plus className="h-4 w-4" />
              Nouveau
            </Link>
          </Button>
        </div>
      </div>
      {stats.totalCount ? <VehicleChecksStats stats={stats} /> : null}
      {isLoading && vehicleChecks.length === 0 ? (
        <LoadingScreen fullScreen={false} />
      ) : (
        <VehicleCheckTable
          dateRange={dateRange}
          isLoading={isLoading}
          vehicleChecks={vehicleChecks}
          onDeleted={handleVehicleCheckDeleted}
          onDateFilterChange={(range) =>
            void loadVehicleChecks({ ...listParams, ...range, page: 1 })
          }
          serverPagination={{
            page: listParams.page ?? 1,
            pageSize: listParams.pageSize ?? 10,
            total,
            totalPages,
            onPageChange: (page) =>
              void loadVehicleChecks({ ...listParams, page }),
            onPageSizeChange: (pageSize) =>
              void loadVehicleChecks({ ...listParams, page: 1, pageSize }),
            onSearchChange: (search) =>
              void loadVehicleChecks({
                ...listParams,
                page: 1,
                search: search.trim() || undefined,
              }),
            onSortChange: (sortBy, sortDirection) =>
              void loadVehicleChecks({
                ...listParams,
                page: 1,
                sortBy,
                sortDirection,
              }),
          }}
          onUpdated={handleVehicleCheckUpdated}
        />
      )}
    </>
  );
}

const vehicleCheckSortFields = new Set([
  "checkDate",
  "checkNumber",
  "city",
  "licensePlate",
  "status",
  "totalInternalSavingAmount",
]);

function getListParams(searchParams: Pick<URLSearchParams, "get">): VehicleCheckListParams {
  const page = Number(searchParams.get("page"));
  const pageSize = Number(searchParams.get("pageSize"));
  const sortBy = searchParams.get("sortBy");
  const sortDirection = searchParams.get("sortDirection");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: [10, 25, 50, 100].includes(pageSize) ? pageSize : 10,
    sortBy: sortBy && vehicleCheckSortFields.has(sortBy) ? sortBy : "checkDate",
    sortDirection: sortDirection === "asc" ? "asc" : "desc",
    dateFrom: dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom) ? dateFrom : undefined,
    dateTo: dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? dateTo : undefined,
  };
}

function saveListParamsInUrl(params: VehicleCheckListParams) {
  const searchParams = new URLSearchParams();

  if ((params.page ?? 1) > 1) searchParams.set("page", String(params.page));
  if ((params.pageSize ?? 10) !== 10) searchParams.set("pageSize", String(params.pageSize));
  if (params.sortBy && params.sortBy !== "checkDate") searchParams.set("sortBy", params.sortBy);
  if (params.sortDirection && params.sortDirection !== "desc") searchParams.set("sortDirection", params.sortDirection);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);

  const query = searchParams.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

function VehicleChecksStats({ stats }: { stats: VehicleCheckListStats }) {
  const cards = [
    {
      description: "Brouillons en cours",
      icon: ClipboardList,
      title: "En cours",
      tone: "slate",
      value: formatInteger(stats.draftCount),
    },
    {
      description: "Decisions a traiter",
      icon: ListChecks,
      title: "A analyser",
      tone: "amber",
      value: formatInteger(stats.toAnalyzeCount),
    },
    {
      description: "En reparation",
      icon: Wrench,
      title: "Chez carrossier",
      tone: "emerald",
      value: formatInteger(stats.takenInChargeCount),
    },
    {
      description: "Pieces a commander",
      icon: PackageCheck,
      title: "Pieces a commander",
      tone: "blue",
      value: formatInteger(stats.toOrderCount),
    },
    {
      description: "Dossiers reellement termines",
      icon: CheckCircle2,
      title: "Termines",
      tone: "teal",
      value: formatInteger(stats.completedCount),
    },
    {
      description: "Gain reference",
      icon: Euro,
      title: "Economies",
      tone: "emerald",
      value: formatCompactMoney(stats.totalSavingAmount),
    },
  ] satisfies Array<{
    description: string;
    icon: LucideIcon;
    title: string;
    tone: StatTone;
    value: string;
  }>;

  return (
    <section className="mb-5 flex snap-x gap-3 overflow-x-auto pb-2 pr-4 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pb-0 sm:pr-0 lg:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <StatCard description={card.description} icon={card.icon} key={card.title} title={card.title} tone={card.tone} value={card.value} />
      ))}
    </section>
  );
}

type StatTone = "amber" | "blue" | "emerald" | "slate" | "teal";

const statToneStyles: Record<StatTone, string> = {
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  teal: "bg-teal-50 text-teal-600 ring-teal-100",
};

function StatCard({ description, icon: Icon, title, tone, value }: { description: string; icon: LucideIcon; title: string; tone: StatTone; value: string }) {
  return (
    <Card className="w-[72vw] max-w-[260px] shrink-0 snap-start rounded-[16px] border-[#e9e9e9] bg-white sm:w-auto sm:max-w-none sm:shrink">
      <CardContent className="p-4">
        <div className="flex min-h-[84px] items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${statToneStyles[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase leading-tight text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-wide text-slate-950">{value}</p>
            <p className="mt-1 text-[11px] font-semibold leading-tight text-slate-500">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatCompactMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: 0,
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
    style: "currency",
  }).format(value);
}
