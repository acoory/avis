"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, CarFront, History, Maximize2, Plus, Search, Undo2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DepartureCard } from "./departure-card";
import { DepartureDrawer } from "./departure-drawer";
import { NewDepartureModal } from "./new-departure-modal";
import { departuresService } from "@/services/departures.service";
import { Departure, Provider } from "@/types/departures";
import { Agency } from "@/types/business";
import { isAway, overdueDays } from "@/lib/departures";
import { cn } from "@/lib/utils";

type Filter = "ALL" | "AT_PROVIDER" | "WORK_IN_PROGRESS" | "READY_FOR_PICKUP" | "OVERDUE";
const filters: Array<[Filter, string]> = [
  ["ALL", "Tous"],
  ["AT_PROVIDER", "Chez prestataire"],
  ["WORK_IN_PROGRESS", "En intervention"],
  ["READY_FOR_PICKUP", "Prêts à récupérer"],
  ["OVERDUE", "En retard"],
];

export function DeparturesBoard({ wall = false }: { wall?: boolean }) {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const load = useCallback(
    async (quiet = false) => {
      if (!agencyId) return;
      try {
        const [active, providerList] = await Promise.all([departuresService.active(agencyId), departuresService.providers(agencyId)]);
        setDepartures(active);
        setProviders(providerList);
      } catch {
        if (!quiet) toast.error("Impossible de charger le tableau.");
      } finally {
        setLoading(false);
      }
    },
    [agencyId],
  );
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        void departuresService.agencies().then((items) => {
          setAgencies(items);
          const saved = window.localStorage.getItem("departures:agency-id");
          setAgencyId(items.some((item) => item.id === saved) ? saved! : (items[0]?.id ?? ""));
          if (!items.length) setLoading(false);
        }),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!agencyId) return;
    window.localStorage.setItem("departures:agency-id", agencyId);
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(true), 20_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [agencyId, load]);
  const visible = useMemo(
    () =>
      departures.filter((item) => {
        const matchesSearch =
          !query ||
          item.vehicle.registration.includes(query.toUpperCase().replace(/[^A-Z0-9]/g, "")) ||
          `${item.vehicle.brand ?? ""} ${item.vehicle.model ?? ""}`.toLowerCase().includes(query.toLowerCase());
        const matchesFilter =
          filter === "ALL" ||
          (filter === "AT_PROVIDER" && item.status === "AT_PROVIDER") ||
          (filter === "WORK_IN_PROGRESS" && item.status === "WORK_IN_PROGRESS") ||
          (filter === "READY_FOR_PICKUP" && ["READY_FOR_PICKUP", "PICKUP_PLANNED"].includes(item.status)) ||
          (filter === "OVERDUE" && overdueDays(item) > 0);
        return matchesSearch && matchesFilter;
      }),
    [departures, query, filter],
  );
  const stats = useMemo(
    () => ({
      away: departures.filter((d) => isAway(d.status)).length,
      inProgress: departures.filter((d) => d.status === "WORK_IN_PROGRESS").length,
      ready: departures.filter((d) => d.status === "READY_FOR_PICKUP").length,
      overdue: departures.filter((d) => overdueDays(d) > 0).length,
    }),
    [departures],
  );
  async function action(id: string, type: "ready" | "return") {
    try {
      if (type === "ready") await departuresService.ready(id);
      if (type === "return") await departuresService.returnVehicle(id);
      toast.success(type === "return" ? "Dossier clôturé, véhicule revenu." : "Statut mis à jour.");
      await load(true);
    } catch {
      toast.error("Cette action n’a pas pu être réalisée.");
    }
  }
  async function drop(providerId: string) {
    if (!draggedId) return;
    const current = departures.find((d) => d.id === draggedId);
    setDraggedId(null);
    if (!current || current.providerId === providerId) return;
    setDepartures((items) => items.map((d) => (d.id === current.id ? { ...d, providerId, provider: providers.find((p) => p.id === providerId) ?? d.provider } : d)));
    try {
      await departuresService.changeProvider(current.id, providerId);
      toast.success("Prestataire modifié.");
    } catch {
      toast.error("Déplacement impossible.");
      await load(true);
    }
  }
  return (
    <div className={cn("min-w-0", wall && "min-h-screen bg-slate-100 p-5")}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={cn("font-bold tracking-tight text-slate-950", wall ? "text-xl" : "text-2xl")}>Départs véhicules</h1>
          <p className="mt-1 text-sm text-slate-500">Suivi des véhicules confiés aux prestataires externes.</p>
          <select
            aria-label="Agence active"
            className="mt-2 h-9 max-w-64 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
            value={agencyId}
            onChange={(event) => setAgencyId(event.target.value)}
          >
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.city} · {agency.name}
              </option>
            ))}
          </select>
        </div>
        {!wall ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/departures/history">
                <History className="h-4 w-4" />
                Historique
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/providers">
                <Building2 className="h-4 w-4" />
                Prestataires
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/departures/wall">
                <Maximize2 className="h-4 w-4" />
                Affichage mural
              </Link>
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouveau départ
            </Button>
          </div>
        ) : (
          <Button asChild variant="outline">
            <Link href="/dashboard/departures">
              <Undo2 className="h-4 w-4" />
              Quitter le mode mural
            </Link>
          </Button>
        )}
      </div>
      {!wall ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={CarFront} label="Actuellement dehors" value={stats.away} />
            <Stat icon={Wrench} label="En intervention" value={stats.inProgress} />
            <Stat icon={CarFront} label="Prêts à récupérer" value={stats.ready} accent="emerald" />
            <Stat icon={AlertTriangle} label="En retard" value={stats.overdue} accent="red" />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-64 flex-1 md:max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm"
                placeholder="Rechercher une immatriculation…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {filters.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  filter === value ? "border-teal-700 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {loading ? (
        <div className="rounded-lg border bg-white p-10 text-center text-sm text-slate-500">Chargement du tableau…</div>
      ) : !providers.length ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center">
          <h2 className="font-semibold">Aucun prestataire actif</h2>
          <p className="mt-1 text-sm text-slate-500">Créez d’abord les colonnes du tableau.</p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard/providers">Gérer les prestataires</Link>
          </Button>
        </div>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1 pb-5">
          <div className="flex min-w-max items-start gap-2">
            {providers.map((provider) => {
              const cards = visible.filter((d) => d.providerId === provider.id);
              return (
                <section
                  key={provider.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void drop(provider.id)}
                  className={cn("w-[238px] shrink-0 rounded-lg border border-slate-200 bg-slate-100/80", wall && "w-[254px]")}
                >
                  <header className="flex items-center justify-between border-b border-slate-200 px-2.5 py-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-xs font-extrabold uppercase tracking-wide text-slate-800">{provider.name}</h2>
                      <p className="text-[9px] text-slate-500">
                        {cards.length} véhicule{cards.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-slate-600 shadow-sm">
                      {cards.length}
                    </span>
                  </header>
                  <div className="min-h-20 space-y-1.5 p-1.5">
                    {cards.map((departure) => (
                      <DepartureCard
                        key={departure.id}
                        departure={departure}
                        onOpen={() => setSelectedId(departure.id)}
                        onAction={(type) => void action(departure.id, type)}
                        onDragStart={() => setDraggedId(departure.id)}
                      />
                    ))}
                    {!cards.length ? (
                      <div className="rounded-md border border-dashed border-slate-300 p-3 text-center text-[10px] text-slate-400">Déposer ici</div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      {!wall && newOpen ? (
        <NewDepartureModal
          agencyId={agencyId}
          open
          providers={providers}
          onClose={() => setNewOpen(false)}
          onCreated={() => void load(true)}
          onExisting={setSelectedId}
        />
      ) : null}
      {selectedId ? <DepartureDrawer key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} onChanged={() => void load(true)} /> : null}
    </div>
  );
}
function Stat({ icon: Icon, label, value, accent = "slate" }: { icon: typeof CarFront; label: string; value: number; accent?: "slate" | "emerald" | "red" }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md",
          accent === "red" ? "bg-red-50 text-red-600" : accent === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}
