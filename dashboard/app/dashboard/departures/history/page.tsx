"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DepartureDrawer } from "@/components/departures/departure-drawer";
import { formatRegistration, dayDiff, longDate } from "@/lib/departures";
import { departuresService } from "@/services/departures.service";
import { Departure, INTERVENTION_LABELS, STATUS_LABELS } from "@/types/departures";
import { Agency } from "@/types/business";

export default function DepartureHistoryPage() {
  const [items, setItems] = useState<Departure[]>([]); const [query, setQuery] = useState(""); const [selectedId, setSelectedId] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<Agency[]>([]); const [agencyId, setAgencyId] = useState("");
  useEffect(() => { void departuresService.agencies().then((data) => { setAgencies(data); const saved = window.localStorage.getItem("departures:agency-id"); setAgencyId(data.some((item) => item.id === saved) ? saved! : (data[0]?.id ?? "")); }); }, []);
  useEffect(() => { if (!agencyId) return; const timer = window.setTimeout(() => { setLoading(true); void departuresService.history(agencyId, query).then((r) => setItems(r.items)).finally(() => setLoading(false)); }, 250); return () => clearTimeout(timer); }, [agencyId, query]);
  return <div><div className="mb-5 flex items-start justify-between"><div><Button asChild variant="ghost" className="mb-2 -ml-3"><Link href="/dashboard/departures"><ArrowLeft className="h-4 w-4" />Retour au tableau</Link></Button><h1 className="text-2xl font-bold">Historique des départs</h1><p className="mt-1 text-sm text-slate-500">Retrouvez tous les passages clôturés par immatriculation.</p></div></div>
    <div className="mb-3"><select aria-label="Agence" className="h-10 max-w-64 rounded-md border bg-white px-3 text-sm" value={agencyId} onChange={(event) => setAgencyId(event.target.value)}>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.city} · {agency.name}</option>)}</select></div>
    <div className="relative mb-4 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="h-10 w-full rounded-md border bg-white pl-9 pr-3 text-sm" placeholder="Rechercher une immatriculation…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    <div className="overflow-hidden rounded-lg border bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Véhicule</th><th className="px-4 py-3">Prestataire</th><th className="px-4 py-3">Motif</th><th className="px-4 py-3">Créé le</th><th className="px-4 py-3">Durée</th><th className="px-4 py-3">Statut</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)} className="cursor-pointer hover:bg-slate-50"><td className="px-4 py-3"><strong className="font-mono">{formatRegistration(item.vehicle.registration)}</strong><p className="text-xs text-slate-400">{[item.vehicle.brand, item.vehicle.model].filter(Boolean).join(" ")}</p></td><td className="px-4 py-3 font-medium">{item.provider.name}</td><td className="px-4 py-3">{INTERVENTION_LABELS[item.interventionType]}</td><td className="px-4 py-3 text-slate-500">{longDate(item.createdAt)}</td><td className="px-4 py-3">{item.departedAt && item.returnedAt ? `${dayDiff(item.departedAt, item.returnedAt)} j` : "—"}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{STATUS_LABELS[item.status]}</span></td></tr>)}</tbody></table>{loading ? <p className="p-8 text-center text-sm text-slate-400">Chargement…</p> : !items.length ? <p className="p-8 text-center text-sm text-slate-400">Aucun départ trouvé.</p> : null}</div>
    {selectedId ? <DepartureDrawer key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} onChanged={() => undefined} /> : null}
  </div>;
}
