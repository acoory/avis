"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { departuresService } from "@/services/departures.service";
import { formatRegistration } from "@/lib/departures";
import { INTERVENTION_LABELS, InterventionType, Provider, VehicleSearchResult } from "@/types/departures";

type Props = { open: boolean; agencyId: string; providers: Provider[]; initialRegistration?: string; onClose: () => void; onCreated: () => void; onExisting?: (id: string) => void };
export function NewDepartureModal({ open, agencyId, providers, initialRegistration = "", onClose, onCreated, onExisting }: Props) {
  const [registration, setRegistration] = useState(initialRegistration); const [vehicle, setVehicle] = useState<VehicleSearchResult | null>(null);
  const [searchedKey, setSearchedKey] = useState(""); const [brand, setBrand] = useState(""); const [model, setModel] = useState("");
  const [providerId, setProviderId] = useState(providers[0]?.id ?? ""); const [interventionType, setInterventionType] = useState<InterventionType>("BODYWORK");
  const [description, setDescription] = useState(""); const [appointmentAt, setAppointmentAt] = useState("");
  const [advanced, setAdvanced] = useState(false); const [saving, setSaving] = useState(false);
  useEffect(() => {
    const normalized = registration.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!open || normalized.length < 5) return;
    const timer = window.setTimeout(async () => { const results = await departuresService.searchVehicles(agencyId, registration); setVehicle(results.find((item) => item.registration === normalized) ?? null); setSearchedKey(normalized); }, 250);
    return () => window.clearTimeout(timer);
  }, [agencyId, registration, open]);
  if (!open) return null;
  const normalizedRegistration = registration.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const searched = searchedKey === normalizedRegistration;
  const currentVehicle = searched ? vehicle : null;
  const active = currentVehicle?.departures[0];
  async function submit() {
    if (!registration.trim() || !providerId) { toast.error("La plaque et le prestataire sont obligatoires."); return; }
    setSaving(true);
    try {
      await departuresService.create({ agencyId, registration, brand: currentVehicle ? undefined : brand, model: currentVehicle ? undefined : model, providerId, interventionType, description: description || undefined, appointmentAt: appointmentAt || undefined });
      toast.success("Le véhicule est enregistré comme parti."); onCreated(); onClose();
    } catch (error) {
      const data = (error as AxiosError<{ message?: string; departureId?: string }>).response?.data;
      toast.error(data?.message ?? "Impossible de créer le départ."); if (data?.departureId) onExisting?.(data.departureId);
    } finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4 pt-[8vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold text-slate-950">Nouveau départ</h2><p className="text-xs text-slate-500">Les autres informations pourront être ajoutées plus tard.</p></div><button onClick={onClose} className="rounded p-1.5 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
      <div className="space-y-4 p-5">
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">À la validation, le véhicule sera considéré comme parti maintenant chez le prestataire.</div>
        <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Immatriculation *</span><Input autoFocus className="h-12 font-mono text-lg font-bold uppercase tracking-wider" placeholder="HJ-345-CB" value={registration} onChange={(e) => setRegistration(formatRegistration(e.target.value))} /></label>
        {active ? <button className="w-full rounded-lg border border-amber-300 bg-amber-50 p-3 text-left text-sm text-amber-900" onClick={() => onExisting?.(active.id)}><strong>Départ actif existant</strong><span className="block text-xs">Chez {active.provider.name} · Voir le dossier</span></button> : null}
        {searched && !active ? <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">{currentVehicle ? <><strong>{formatRegistration(currentVehicle.registration)}</strong><span className="ml-2 text-slate-500">{[currentVehicle.brand, currentVehicle.model].filter(Boolean).join(" ") || "Véhicule existant"}</span></> : <strong>Nouveau véhicule</strong>}</div> : null}
        {!currentVehicle && searched ? <div className="grid grid-cols-2 gap-3"><Input placeholder="Marque (facultatif)" value={brand} onChange={(e) => setBrand(e.target.value)} /><Input placeholder="Modèle (facultatif)" value={model} onChange={(e) => setModel(e.target.value)} /></div> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Prestataire *</span><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={providerId} onChange={(e) => setProviderId(e.target.value)}><option value="">Sélectionner…</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Motif *</span><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={interventionType} onChange={(e) => setInterventionType(e.target.value as InterventionType)}>{Object.entries(INTERVENTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <button type="button" onClick={() => setAdvanced(!advanced)} className="flex items-center gap-1 text-xs font-semibold text-teal-700"><ChevronDown className={`h-3.5 w-3.5 transition ${advanced ? "rotate-180" : ""}`} /> Informations complémentaires</button>
        {advanced ? <div className="space-y-3 rounded-lg border bg-slate-50 p-3"><textarea className="min-h-20 w-full rounded-md border border-slate-200 bg-white p-3 text-sm" placeholder="Commentaire" value={description} onChange={(e) => setDescription(e.target.value)} /><label className="block max-w-xs text-xs text-slate-600">Rendez-vous<Input className="mt-1" type="datetime-local" value={appointmentAt} onChange={(e) => setAppointmentAt(e.target.value)} /></label></div> : null}
      </div>
      <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-3"><Button variant="ghost" onClick={onClose}>Annuler</Button><Button disabled={saving || Boolean(active) || !providers.length} onClick={() => void submit()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Enregistrer le départ</Button></div>
    </div>
  </div>;
}
