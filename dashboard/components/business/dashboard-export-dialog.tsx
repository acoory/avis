"use client";

import {
  BarChart3,
  Car,
  Check,
  Download,
  Euro,
  LoaderCircle,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  businessService,
  exportDashboardKpisUrl,
} from "@/services/business.service";
import { useAuthStore } from "@/stores/auth.store";
import { VehiclePart } from "@/types/business";

type DashboardExportDialogProps = {
  collaboratorId?: string;
  dateRange?: { dateFrom?: string; dateTo?: string };
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

type GroupBy = "agency" | "collaborator" | "manufacturer" | "none";
type Preset = "custom" | "repairs" | "summary";

type KpiOption = {
  description: string;
  key: string;
  label: string;
};

const kpiGroups: Array<{
  icon: typeof Car;
  options: KpiOption[];
  title: string;
}> = [
  {
    icon: Car,
    title: "Activité",
    options: [
      {
        key: "vehicleChecks",
        label: "Véhicules contrôlés",
        description: "Nombre de dossiers sur la période.",
      },
      {
        key: "completed",
        label: "Contrôles terminés",
        description: "Dossiers terminés ou clos sans dommage.",
      },
      {
        key: "toAnalyze",
        label: "Dossiers à analyser",
        description: "Contrôles en attente de décision.",
      },
      {
        key: "draft",
        label: "Brouillons",
        description: "Contrôles encore à compléter.",
      },
    ],
  },
  {
    icon: Wrench,
    title: "Réparations",
    options: [
      {
        key: "repairQuantity",
        label: "Quantité de réparations",
        description: "Somme des quantités des lignes retenues.",
      },
      {
        key: "vehiclesWithRepairs",
        label: "Véhicules avec réparations",
        description: "Chaque véhicule est compté une seule fois.",
      },
      {
        key: "averageRepairsPerVehicle",
        label: "Moyenne par véhicule",
        description: "Nombre moyen de réparations par contrôle.",
      },
      {
        key: "partOrders",
        label: "Commandes de pièces",
        description: "Lignes actuellement marquées à commander.",
      },
      {
        key: "partsBreakdown",
        label: "Détail par pièce",
        description: "Pneus, jantes, pare-chocs et autres pièces.",
      },
      {
        key: "repairTypesBreakdown",
        label: "Détail par type",
        description: "Répartition par type de réparation.",
      },
    ],
  },
  {
    icon: Euro,
    title: "Financier",
    options: [
      {
        key: "totalSavings",
        label: "Économies totales",
        description: "Économie interne cumulée.",
      },
      {
        key: "averageSavings",
        label: "Économie moyenne",
        description: "Économie moyenne par véhicule.",
      },
      {
        key: "totalInternalCost",
        label: "Coût interne total",
        description: "Coût interne cumulé des contrôles.",
      },
      {
        key: "totalDifference",
        label: "Différence totale",
        description: "Écart total observé sur la période.",
      },
    ],
  },
];

const presetKpis: Record<Exclude<Preset, "custom">, string[]> = {
  summary: [
    "vehicleChecks",
    "completed",
    "toAnalyze",
    "repairQuantity",
    "partOrders",
    "totalSavings",
    "totalInternalCost",
    "totalDifference",
  ],
  repairs: [
    "repairQuantity",
    "vehiclesWithRepairs",
    "averageRepairsPerVehicle",
    "partOrders",
    "partsBreakdown",
    "repairTypesBreakdown",
    "totalSavings",
  ],
};

const presets: Array<{
  description: string;
  icon: typeof Car;
  id: Exclude<Preset, "custom">;
  label: string;
}> = [
  {
    description: "Vue courte avec activité, économies et coûts.",
    icon: BarChart3,
    id: "summary",
    label: "Synthèse KPI",
  },
  {
    description: "Pièces, types et volumes de réparations.",
    icon: Wrench,
    id: "repairs",
    label: "Analyse réparations",
  },
];

export function DashboardExportDialog({
  collaboratorId,
  dateRange,
  onOpenChange,
  open,
}: DashboardExportDialogProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [isExporting, setIsExporting] = useState(false);
  const [parts, setParts] = useState<VehiclePart[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [preset, setPreset] = useState<Preset>("summary");
  const [selectedKpis, setSelectedKpis] = useState<Set<string>>(
    () => new Set(presetKpis.summary),
  );
  const [selectedPartCodes, setSelectedPartCodes] = useState<Set<string>>(
    () => new Set(),
  );

  const activeParts = useMemo(
    () =>
      parts
        .filter((part) => part.isActive)
        .sort(
          (first, second) =>
            first.displayOrder - second.displayOrder ||
            first.name.localeCompare(second.name, "fr"),
        ),
    [parts],
  );
  const allPartsSelected = selectedPartCodes.size === 0;
  const selectedCount = selectedKpis.size;

  useEffect(() => {
    if (!open || parts.length) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPartsLoading(true);
    });
    void businessService
      .vehicleParts()
      .then((items) => {
        if (!cancelled) setParts(items);
      })
      .catch(() => {
        if (!cancelled) setParts([]);
      })
      .finally(() => {
        if (!cancelled) setPartsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, parts.length]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isExporting) onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExporting, onOpenChange, open]);

  if (!open || typeof document === "undefined") return null;

  function selectPreset(nextPreset: Exclude<Preset, "custom">) {
    setPreset(nextPreset);
    setSelectedKpis(new Set(presetKpis[nextPreset]));
  }

  function toggleKpi(key: string) {
    setPreset("custom");
    setSelectedKpis((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function togglePart(code: string) {
    setSelectedPartCodes((current) => {
      if (!current.size) return new Set([code]);

      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next.size ? next : new Set();
    });
  }

  async function exportDashboardKpis() {
    if (!selectedKpis.size) return;

    setIsExporting(true);
    try {
      const response = await fetch(
        exportDashboardKpisUrl({
          collaboratorId: collaboratorId || undefined,
          dateFrom: dateRange?.dateFrom,
          dateTo: dateRange?.dateTo,
          groupBy,
          kpis: [...selectedKpis],
          partCodes:
            selectedKpis.has("partsBreakdown") && selectedPartCodes.size
              ? [...selectedPartCodes]
              : undefined,
        }),
        {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {},
        },
      );
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dashboard-kpis-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export KPI téléchargé.");
      onOpenChange(false);
    } catch {
      toast.error("Impossible de générer l’export KPI.");
    } finally {
      setIsExporting(false);
    }
  }

  return createPortal(
    <div
      aria-labelledby="dashboard-export-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-slate-950/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      onClick={() => !isExporting && onOpenChange(false)}
    >
      <div
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-4xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2
              className="text-lg font-bold text-slate-950"
              id="dashboard-export-title"
            >
              Export personnalisé du tableau de bord
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              L’export Excel manager reste disponible à côté de ce bouton.
            </p>
          </div>
          <Button
            aria-label="Fermer"
            disabled={isExporting}
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Modèle</h3>
              {preset === "custom" ? (
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                  Sélection personnalisée
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {presets.map((item) => {
                const Icon = item.icon;
                const selected = preset === item.id;
                return (
                  <button
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition",
                      selected
                        ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                    )}
                    key={item.id}
                    type="button"
                    onClick={() => selectPreset(item.id)}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        selected
                          ? "bg-teal-700 text-white"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-bold text-slate-950">
                        {item.label}
                        {selected ? <Check className="h-4 w-4 text-teal-700" /> : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">
                KPI à inclure
              </h3>
              <span className="text-xs font-medium text-slate-500">
                {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              {kpiGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <fieldset
                    className="rounded-xl border border-slate-200 p-4"
                    key={group.title}
                  >
                    <legend className="px-1">
                      <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Icon className="h-4 w-4 text-teal-700" />
                        {group.title}
                      </span>
                    </legend>
                    <div className="space-y-3 pt-1">
                      {group.options.map((option) => (
                        <label
                          className="flex cursor-pointer items-start gap-2.5"
                          key={option.key}
                        >
                          <input
                            checked={selectedKpis.has(option.key)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-teal-700"
                            type="checkbox"
                            onChange={() => toggleKpi(option.key)}
                          />
                          <span>
                            <span className="block text-sm font-semibold text-slate-800">
                              {option.label}
                            </span>
                            <span className="mt-0.5 block text-xs leading-4 text-slate-500">
                              {option.description}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </section>

          {selectedKpis.has("partsBreakdown") ? (
            <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pièces à analyser
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Choisis notamment les pneus, les jantes ou toute autre pièce.
                  </p>
                </div>
                <button
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-bold",
                    allPartsSelected
                      ? "border-teal-600 bg-teal-700 text-white"
                      : "border-slate-300 bg-white text-slate-700",
                  )}
                  type="button"
                  onClick={() => setSelectedPartCodes(new Set())}
                >
                  Toutes les pièces
                </button>
              </div>
              {partsLoading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Chargement des pièces…
                </div>
              ) : (
                <div className="mt-4 flex max-h-44 flex-wrap gap-2 overflow-y-auto">
                  {activeParts.map((part) => {
                    const selected = selectedPartCodes.has(part.code);
                    return (
                      <button
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                          selected
                            ? "border-teal-600 bg-teal-50 text-teal-800"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                        )}
                        key={part.id}
                        type="button"
                        onClick={() => togglePart(part.code)}
                      >
                        {part.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          <section className="mt-6 grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
            <div>
              <label
                className="text-sm font-bold text-slate-900"
                htmlFor="dashboard-export-group"
              >
                Regrouper les résultats
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Ajoute une feuille de comparaison dans le classeur.
              </p>
            </div>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
              id="dashboard-export-group"
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as GroupBy)}
            >
              <option value="none">Total général uniquement</option>
              <option value="agency">Par agence</option>
              <option value="collaborator">Par collaborateur</option>
              <option value="manufacturer">Par constructeur</option>
            </select>
          </section>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-700">Excel</span>
            {dateRange?.dateFrom || dateRange?.dateTo ? (
              <span>
                {" "}· {dateRange.dateFrom ?? "Début"} au{" "}
                {dateRange.dateTo ?? "Aujourd’hui"}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              disabled={isExporting}
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              disabled={!selectedKpis.size || isExporting}
              type="button"
              onClick={exportDashboardKpis}
            >
              {isExporting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? "Génération…" : "Exporter les KPI"}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
