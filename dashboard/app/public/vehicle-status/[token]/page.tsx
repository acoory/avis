"use client";

import { CarFront, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ReadylineBrand } from "@/components/branding/readyline-brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatLicensePlate } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { PublicAgencyVehicleStatus, PublicAgencyVehicleStatusResponse } from "@/types/business";

type StatusFilter = "IN_PROGRESS" | "COMPLETED" | "ALL";

const filters: Array<{ label: string; value: StatusFilter }> = [
  { label: "Travaux en cours", value: "IN_PROGRESS" },
  { label: "Terminés", value: "COMPLETED" },
  { label: "Tous", value: "ALL" },
];

export default function PublicVehicleStatusPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<PublicAgencyVehicleStatusResponse | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("IN_PROGRESS");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const loadVehicles = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const response = await businessService.publicAgencyVehicleStatuses(params.token, {
          page,
          pageSize: 20,
          search: search || undefined,
          status: filter,
        });
        setData(response);
        setIsUnavailable(false);
      } catch {
        setIsUnavailable(true);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [filter, page, params.token, search],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    const interval = window.setInterval(() => void loadVehicles(true), 60000);
    return () => window.clearInterval(interval);
  }, [loadVehicles]);

  if (isUnavailable && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <ReadylineBrand className="justify-center" size="compact" />
          <h1 className="mt-6 text-xl font-bold text-slate-950">Suivi indisponible</h1>
          <p className="mt-2 text-sm text-slate-500">Ce lien n’est plus actif ou n’existe pas.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <ReadylineBrand size="compact" />
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Suivi des véhicules</p>
                <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
                  {data ? `${data.agency.city} · ${data.agency.name}` : "Chargement..."}
                </h1>
              </div>
            </div>
            <Button
              className="self-start"
              disabled={isLoading}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void loadVehicles()}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-3 border-b border-slate-100 p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-2">
              {filters.map((item) => {
                const isActive = filter === item.value;
                const count = item.value === "IN_PROGRESS"
                  ? data?.stats.inProgressCount
                  : item.value === "COMPLETED"
                    ? data?.stats.completedCount
                    : data
                      ? data.stats.inProgressCount + data.stats.completedCount
                      : undefined;

                return (
                  <button
                    className={`rounded-xl border px-2 py-2.5 text-center transition-colors ${
                      isActive
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50"
                    }`}
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setFilter(item.value);
                      setPage(1);
                    }}
                  >
                    <span className="block truncate text-xs font-semibold sm:text-sm">{item.label}</span>
                    <span className={`mt-0.5 block text-xs ${isActive ? "text-white/75" : "text-slate-400"}`}>
                      {count ?? "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-11 pl-9 text-base"
                inputMode="search"
                placeholder="Rechercher une plaque"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100" aria-busy={isLoading}>
            {isLoading ? (
              <VehicleRowsPlaceholder />
            ) : data?.items.length ? (
              data.items.map((vehicle) => (
                <article className="flex items-center gap-3 px-4 py-3.5 sm:px-5" key={vehicle.id}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <CarFront className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold tracking-wide text-slate-950">
                      {formatLicensePlate(vehicle.licensePlate, vehicle.licensePlateCountry, vehicle.licensePlateRaw)}
                    </p>
                    <p className="truncate text-xs font-medium text-slate-500">
                      {vehicle.manufacturer?.name ?? "Marque non renseignée"}
                      {vehicle.vehicleModel?.name ? ` · ${vehicle.vehicleModel.name}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <PublicStatusBadge status={vehicle.publicStatus} />
                    <p
                      className={`mt-1 text-[11px] font-semibold ${
                        vehicle.location === "AT_PROVIDER" ? "text-blue-700" : "text-slate-500"
                      }`}
                    >
                      {vehicle.location === "AT_PROVIDER" ? "Chez prestataire" : "Sur parc"}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">Mis à jour {formatRelativeUpdate(vehicle.updatedAt)}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="px-5 py-12 text-center">
                <CarFront className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">Aucun véhicule trouvé</p>
                <p className="mt-1 text-xs text-slate-400">Modifiez la recherche ou le filtre sélectionné.</p>
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
            <p className="text-xs font-medium text-slate-500">
              {data?.total ?? 0} véhicule{(data?.total ?? 0) > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                aria-label="Page précédente"
                disabled={isLoading || page <= 1}
                size="icon"
                type="button"
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-20 text-center text-xs font-semibold text-slate-600">
                {page} / {data?.totalPages ?? 1}
              </span>
              <Button
                aria-label="Page suivante"
                disabled={isLoading || page >= (data?.totalPages ?? 1)}
                size="icon"
                type="button"
                variant="outline"
                onClick={() => setPage((current) => Math.min(data?.totalPages ?? current, current + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}

function PublicStatusBadge({ status }: { status: PublicAgencyVehicleStatus }) {
  const isInProgress = status === "IN_PROGRESS";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
        isInProgress ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
      }`}
    >
      {isInProgress ? "Travaux en cours" : "Terminé"}
    </span>
  );
}

function VehicleRowsPlaceholder() {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <div className="flex animate-pulse items-center gap-3 px-4 py-3.5 sm:px-5" key={index}>
          <div className="h-10 w-10 rounded-xl bg-slate-200" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-40 rounded bg-slate-100" />
          </div>
          <div className="h-7 w-28 rounded-full bg-slate-100" />
        </div>
      ))}
    </>
  );
}

function formatRelativeUpdate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "récemment";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(date);
}
