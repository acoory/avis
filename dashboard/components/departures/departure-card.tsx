"use client";

import { CalendarDays, CircleAlert, Ellipsis, MessageSquare } from "lucide-react";
import { absenceLabel, formatRegistration, overdueDays, shortDate } from "@/lib/departures";
import { cn } from "@/lib/utils";
import { Departure, INTERVENTION_LABELS, STATUS_LABELS } from "@/types/departures";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Props = { departure: Departure; onOpen: () => void; onAction: (action: "ready" | "return") => void; onDragStart?: () => void };

export function DepartureCard({ departure, onOpen, onAction, onDragStart }: Props) {
  const overdue = overdueDays(departure); const absence = absenceLabel(departure);
  const canReady = Boolean(departure.departedAt) && !["READY_FOR_PICKUP", "PICKUP_PLANNED", "RETURNED", "CANCELLED"].includes(departure.status);
  const canReturn = Boolean(departure.departedAt) && !["RETURNED", "CANCELLED"].includes(departure.status);
  return (
    <article draggable onDragStart={onDragStart} onClick={onOpen} className={cn("group cursor-pointer rounded-md border bg-white p-2.5 shadow-sm transition hover:border-slate-300 hover:shadow", overdue ? "border-red-300" : "border-slate-200", departure.priority === "URGENT" && "border-l-[3px] border-l-amber-500")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><p className="font-mono text-[14px] font-extrabold tracking-wide text-slate-950">{formatRegistration(departure.vehicle.registration)}</p>{departure.vehicle.brand || departure.vehicle.model ? <p className="truncate text-[10px] text-slate-500">{[departure.vehicle.brand, departure.vehicle.model].filter(Boolean).join(" ")}</p> : null}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button aria-label="Actions" onClick={(e) => e.stopPropagation()} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Ellipsis className="h-4 w-4" /></button></DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onOpen}>Voir le dossier</DropdownMenuItem><DropdownMenuSeparator />
            {canReady ? <DropdownMenuItem onClick={() => onAction("ready")}>Prêt à récupérer</DropdownMenuItem> : null}
            {canReturn ? <DropdownMenuItem onClick={() => onAction("return")}>Marquer comme revenu</DropdownMenuItem> : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="my-2 border-t border-dashed border-slate-200" />
      <div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-semibold text-slate-800">{INTERVENTION_LABELS[departure.interventionType]}</p>{departure.appointmentAt ? <span className="flex shrink-0 items-center gap-1 text-[9px] text-slate-500"><CalendarDays className="h-3 w-3" />{shortDate(departure.appointmentAt)}</span> : null}</div>
      {departure.description ? <p className="mt-1 truncate text-[10px] text-slate-500">{departure.description}</p> : null}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0"><span className={cn("inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold", departure.status === "READY_FOR_PICKUP" ? "bg-emerald-100 text-emerald-800" : departure.departedAt ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700")}>{STATUS_LABELS[departure.status]}</span>{absence ? <p className="mt-1 truncate text-[9px] font-medium text-slate-500">{absence}</p> : null}</div>
        {(departure._count?.comments ?? 0) > 0 ? <span className="flex items-center gap-1 text-[10px] text-slate-400"><MessageSquare className="h-3 w-3" />{departure._count?.comments}</span> : null}
      </div>
      {overdue > 0 ? <div className="mt-1.5 flex items-center gap-1 rounded bg-red-50 px-1.5 py-1 text-[9px] font-bold text-red-700"><CircleAlert className="h-3 w-3" /> En retard de {overdue} j</div> : null}
    </article>
  );
}
