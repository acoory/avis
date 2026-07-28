"use client";

import { CarFront, ChevronRight, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatLicensePlate } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

type ViewportMetrics = {
  dialogMaxHeight: number;
  height: number;
  offsetTop: number;
};

export function VehicleSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [vehicleChecks, setVehicleChecks] = useState<VehicleCheck[]>([]);
  const [query, setQuery] = useState("");
  const [hasError, setHasError] = useState(false);
  const [viewportMetrics, setViewportMetrics] =
    useState<ViewportMetrics | null>(null);

  const results = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (normalizedQuery.length < 2) return [];

    return vehicleChecks
      .filter((vehicleCheck) =>
        normalizeSearchText(
          [
            vehicleCheck.licensePlate,
            vehicleCheck.licensePlateRaw,
            vehicleCheck.checkNumber,
            vehicleCheck.manufacturer?.name,
            vehicleCheck.vehicleModel?.name,
            vehicleCheck.city,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(normalizedQuery),
      )
      .sort(
        (first, second) =>
          new Date(second.checkDate).getTime() - new Date(first.checkDate).getTime(),
      )
      .slice(0, 8);
  }, [query, vehicleChecks]);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const loadVehicles = useCallback(async () => {
    if (hasLoaded || isLoading) return;

    setIsLoading(true);
    setHasError(false);
    try {
      const data = await businessService.vehicleChecks();
      setVehicleChecks(data);
      setHasLoaded(true);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [hasLoaded, isLoading]);

  const updateViewportMetrics = useCallback(() => {
    const visualViewport = window.visualViewport;
    const height = visualViewport?.height ?? window.innerHeight;
    const horizontalPadding = window.innerWidth >= 640 ? 32 : 16;

    setViewportMetrics({
      dialogMaxHeight: Math.max(height - horizontalPadding, 220),
      height,
      offsetTop: visualViewport?.offsetTop ?? 0,
    });
  }, []);

  const openSearch = useCallback(() => {
    updateViewportMetrics();
    setIsOpen(true);
    void loadVehicles();
  }, [loadVehicles, updateViewportMetrics]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [openSearch]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeSearch();
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeSearch, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", updateViewportMetrics);
    visualViewport?.addEventListener("scroll", updateViewportMetrics);
    window.addEventListener("resize", updateViewportMetrics);

    return () => {
      visualViewport?.removeEventListener("resize", updateViewportMetrics);
      visualViewport?.removeEventListener("scroll", updateViewportMetrics);
      window.removeEventListener("resize", updateViewportMetrics);
    };
  }, [isOpen, updateViewportMetrics]);

  return (
    <>
      <Button
        aria-label="Rechercher un véhicule"
        className="h-9 gap-2 bg-white px-2.5 text-gray-600 shadow-sm hover:text-gray-950 md:min-w-56 md:justify-start"
        size="sm"
        type="button"
        variant="outline"
        onClick={openSearch}
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Rechercher un véhicule</span>
        <span className="ml-auto hidden items-center gap-0.5 text-[10px] text-gray-400 md:flex">
          <kbd className="font-sans">⌘</kbd>
          <kbd className="font-sans">K</kbd>
        </span>
      </Button>

      {isOpen
        ? createPortal(
            <div
              aria-label="Recherche de véhicule"
              aria-modal="true"
              className="fixed left-0 right-0 z-[100] flex items-start justify-center bg-black/55 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-[2px] sm:items-center sm:p-4"
              role="dialog"
              style={{
                height: viewportMetrics
                  ? `${viewportMetrics.height}px`
                  : "100dvh",
                top: viewportMetrics
                  ? `${viewportMetrics.offsetTop}px`
                  : 0,
              }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeSearch();
              }}
            >
              <div
                className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/20 bg-white shadow-2xl"
                style={{
                  maxHeight: viewportMetrics
                    ? `${viewportMetrics.dialogMaxHeight}px`
                    : "calc(100dvh - 1rem)",
                }}
              >
                <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
                  <Search className="h-5 w-5 shrink-0 text-teal-700" />
                  <Input
                    autoFocus
                    aria-label="Immatriculation, numéro de contrôle, marque ou modèle"
                    className="h-11 border-0 bg-transparent px-0 text-base shadow-none outline-none focus:border-0 focus:ring-0"
                    placeholder="Immatriculation, numéro de contrôle, marque ou modèle…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query ? (
                    <button
                      aria-label="Effacer la recherche"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      type="button"
                      onClick={() => setQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    aria-label="Fermer la recherche"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    type="button"
                    onClick={closeSearch}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                  {isLoading ? (
                    <SearchMessage icon={Loader2} iconClassName="animate-spin" message="Chargement des véhicules…" />
                  ) : hasError ? (
                    <SearchMessage
                      icon={Search}
                      message="Impossible de charger les véhicules. Fermez puis réessayez."
                    />
                  ) : query.trim().length < 2 ? (
                    <SearchMessage
                      icon={Search}
                      message="Saisissez au moins deux caractères pour lancer la recherche."
                    />
                  ) : results.length ? (
                    <div className="divide-y divide-gray-100">
                      {results.map((vehicleCheck) => (
                        <Link
                          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-teal-50"
                          href={`/dashboard/vehicle-checks/${vehicleCheck.id}`}
                          key={vehicleCheck.id}
                          onClick={closeSearch}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 group-hover:bg-white">
                            <CarFront className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-gray-950">
                              {formatLicensePlate(
                                vehicleCheck.licensePlate,
                                vehicleCheck.licensePlateCountry,
                                vehicleCheck.licensePlateRaw,
                              )}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              {vehicleCheck.manufacturer?.name ?? "Constructeur non précisé"}
                              {vehicleCheck.vehicleModel?.name
                                ? ` · ${vehicleCheck.vehicleModel.name}`
                                : ""}
                              {vehicleCheck.city ? ` · ${vehicleCheck.city}` : ""}
                            </span>
                          </span>
                          <span className="hidden shrink-0 text-right sm:block">
                            <span className="block text-xs font-semibold text-gray-700">
                              {vehicleCheck.checkNumber}
                            </span>
                            <span className="block text-[11px] text-gray-400">
                              {formatDate(vehicleCheck.checkDate)}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-700" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <SearchMessage
                      icon={Search}
                      message={`Aucun véhicule trouvé pour « ${query.trim()} ».`}
                    />
                  )}
                </div>

                <div className="hidden items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2 text-[11px] text-gray-500 sm:flex">
                  <span>Cliquez sur un résultat pour ouvrir le dossier.</span>
                  <span>Échap pour fermer</span>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function SearchMessage({
  icon: Icon,
  iconClassName = "",
  message,
}: {
  icon: typeof Search;
  iconClassName?: string;
  message: string;
}) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-2 px-4 py-8 text-center text-sm text-gray-500">
      <Icon className={`h-5 w-5 text-gray-400 ${iconClassName}`} />
      <p>{message}</p>
    </div>
  );
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}
