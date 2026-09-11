"use client";

import { useEffect, useState } from "react";
import { Clock3, Loader2, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { absenceLabel, formatRegistration, longDate } from "@/lib/departures";
import { departuresService } from "@/services/departures.service";
import { Departure, INTERVENTION_LABELS, STATUS_LABELS } from "@/types/departures";

export function DepartureDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const [departure, setDeparture] = useState<Departure | null>(null); const [comment, setComment] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (id) void departuresService.one(id).then(setDeparture); }, [id]);
  if (!id) return null;
  async function addComment() { if (!departure || !comment.trim()) return; setSaving(true); try { await departuresService.comment(departure.id, comment); setComment(""); setDeparture(await departuresService.one(departure.id)); onChanged(); } catch { toast.error("Impossible d’ajouter le commentaire."); } finally { setSaving(false); } }
  return <div className="fixed inset-0 z-[65] bg-slate-950/25" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><aside className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l bg-white shadow-2xl">
    {!departure ? <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-700" /></div> : <>
      <header className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-5 py-4"><div><p className="font-mono text-xl font-extrabold tracking-wide">{formatRegistration(departure.vehicle.registration)}</p><p className="text-sm text-slate-500">{[departure.vehicle.brand, departure.vehicle.model].filter(Boolean).join(" ") || "Véhicule"}</p></div><button onClick={onClose} className="rounded p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button></header>
      <div className="space-y-6 p-5">
        <section className="grid grid-cols-2 gap-3 rounded-lg border bg-slate-50 p-4 text-sm"><Info label="Prestataire" value={departure.provider.name} /><Info label="Motif" value={INTERVENTION_LABELS[departure.interventionType]} /><Info label="Statut" value={STATUS_LABELS[departure.status]} /><Info label="Temps d’absence" value={absenceLabel(departure) ?? "Pas encore parti"} /></section>
        <section><h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Dates</h3><div className="space-y-2 text-sm"><DateRow label="Dossier créé" value={departure.createdAt} /><DateRow label="Départ" value={departure.departedAt} /><DateRow label="Rendez-vous" value={departure.appointmentAt} /><DateRow label="Retour prévu" value={departure.estimatedReturnAt} /><DateRow label="Retour" value={departure.returnedAt} /></div></section>
        <section><h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><MessageSquare className="h-3.5 w-3.5" /> Commentaires</h3><div className="flex gap-2"><Input placeholder="Ajouter une note…" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void addComment(); }} /><Button disabled={saving || !comment.trim()} onClick={() => void addComment()}>Ajouter</Button></div><div className="mt-3 space-y-2">{departure.comments?.map((item) => <div key={item.id} className="rounded-md border p-3 text-sm"><p>{item.message}</p><p className="mt-1 text-[11px] text-slate-400">{personName(item.user)} · {longDate(item.createdAt)}</p></div>)}{!departure.comments?.length ? <p className="text-sm text-slate-400">Aucun commentaire.</p> : null}</div></section>
        <section><h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Historique</h3><div className="relative space-y-3 border-l border-slate-200 pl-4">{departure.histories?.map((item) => <div key={item.id} className="relative text-sm before:absolute before:-left-[19px] before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-slate-400"><p className="font-medium text-slate-700">{historyLabel(item.action, item.newValue)}</p><p className="text-[11px] text-slate-400">{personName(item.user)} · {longDate(item.createdAt)}</p></div>)}</div></section>
      </div>
    </>}
  </aside></div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-semibold uppercase text-slate-400">{label}</p><p className="mt-0.5 font-semibold text-slate-800">{value}</p></div>; }
function DateRow({ label, value }: { label: string; value?: string | null }) { return <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">{label}</span><strong className="text-right text-slate-700">{longDate(value)}</strong></div>; }
function personName(user?: { firstName?: string | null; lastName?: string | null } | null) { return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Système"; }
function historyLabel(action: string, value?: Record<string, unknown> | null) { const labels: Record<string, string> = { CREATED: "Dossier créé", DEPARTED: "Véhicule marqué comme parti", READY_FOR_PICKUP: "Véhicule prêt à récupérer", RETURNED: "Véhicule marqué comme revenu", PROVIDER_CHANGED: "Prestataire modifié", COMMENT_ADDED: "Commentaire ajouté", UPDATED: "Dossier modifié", STATUS_CHANGED: `Statut modifié${value?.status ? ` : ${STATUS_LABELS[value.status as keyof typeof STATUS_LABELS]}` : ""}` }; return labels[action] ?? action; }
