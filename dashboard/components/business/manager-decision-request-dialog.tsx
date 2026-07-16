"use client";

import { Copy, ExternalLink, Loader2, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { businessService } from "@/services/business.service";
import { DecisionManager, VehicleCheck } from "@/types/business";

type ManagerDecisionRequestDialogProps = {
  onOpenChange: (open: boolean) => void;
  onSent?: (vehicleCheck: VehicleCheck) => void;
  open: boolean;
  vehicleCheck: VehicleCheck;
};

export function ManagerDecisionRequestDialog({
  onOpenChange,
  onSent,
  open,
  vehicleCheck,
}: ManagerDecisionRequestDialogProps) {
  const [managers, setManagers] = useState<DecisionManager[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [requestComment, setRequestComment] = useState("");
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedManager = useMemo(
    () => managers.find((manager) => manager.id === selectedManagerId),
    [managers, selectedManagerId],
  );
  const existingShare = useMemo(
    () =>
      vehicleCheck.decisionShares?.find(
        (share) => share.managerId === selectedManagerId,
      ),
    [selectedManagerId, vehicleCheck.decisionShares],
  );
  const decisionUrl =
    existingShare?.token && typeof window !== "undefined"
      ? new URL(
          `/public/decision/${existingShare.token}`,
          window.location.origin,
        ).toString()
      : "";

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setIsLoadingManagers(true);
      void businessService
        .decisionManagers(vehicleCheck.id)
        .then((data) => {
          if (cancelled) return;
          setManagers(data);
          setSelectedManagerId((current) => current || data[0]?.id || "");
        })
        .catch(() => {
          if (cancelled) return;
          setManagers([]);
          toast.error("Impossible de charger les managers.");
        })
        .finally(() => {
          if (!cancelled) setIsLoadingManagers(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [open, vehicleCheck.id]);

  async function sendRequest() {
    if (!selectedManagerId) {
      toast.error("Selectionne un manager.");
      return;
    }

    setIsSending(true);

    try {
      const share = await businessService.sendVehicleCheckDecisionRequestEmail(
        vehicleCheck.id,
        {
          managerId: selectedManagerId,
          requestComment: requestComment.trim() || undefined,
        },
      );

      onSent?.({
        ...vehicleCheck,
        decisionShares: [
          ...(vehicleCheck.decisionShares ?? []).filter(
            (item) => item.managerId !== share.managerId,
          ),
          share,
        ],
      });
      toast.success("Demande envoyee au manager.");
      onOpenChange(false);
    } catch {
      toast.error("Impossible d'envoyer la demande au manager.");
    } finally {
      setIsSending(false);
    }
  }

  async function copyDecisionUrl() {
    if (!decisionUrl) return;
    await navigator.clipboard.writeText(decisionUrl);
    toast.success("Lien copie.");
  }

  function openDecisionUrl() {
    if (!decisionUrl) return;
    window.open(decisionUrl, "_blank", "noopener,noreferrer");
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div
        aria-busy={isSending}
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        {isSending ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80 text-sm font-semibold text-slate-700 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
            Envoi de la demande...
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-base font-bold text-slate-950">
              Demander l&apos;avis manager
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Le manager recevra un lien avec toutes les reparations et photos.
            </p>
          </div>
          <Button
            aria-label="Fermer"
            disabled={isSending}
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <fieldset className="space-y-4 p-4" disabled={isSending}>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Manager
            </span>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
              value={selectedManagerId}
              onChange={(event) => setSelectedManagerId(event.target.value)}
            >
              <option value="">
                {isLoadingManagers
                  ? "Chargement..."
                  : "Selectionner un manager"}
              </option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.firstName} {manager.lastName} - {manager.email}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Commentaire
            </span>
            <textarea
              className="min-h-28 resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-500"
              maxLength={1000}
              placeholder="Ajoute le contexte utile pour ton manager..."
              value={requestComment}
              onChange={(event) => setRequestComment(event.target.value)}
            />
            <span className="text-right text-xs text-slate-400">
              {requestComment.length}/1000
            </span>
          </label>

          {selectedManager ? (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Envoi a {selectedManager.firstName} {selectedManager.lastName}
            </div>
          ) : null}

          {decisionUrl ? (
            <div className="rounded-lg border border-teal-100 bg-teal-50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-teal-950">
                    Lien deja genere
                  </p>
                  <p className="mt-0.5 truncate text-xs text-teal-700">
                    {decisionUrl}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => void copyDecisionUrl()}
                  >
                    <Copy className="h-4 w-4" />
                    Copier
                  </Button>
                  <Button size="sm" type="button" onClick={openDecisionUrl}>
                    <ExternalLink className="h-4 w-4" />
                    Ouvrir
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </fieldset>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
          <Button
            disabled={isSending}
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            disabled={isSending || !selectedManagerId}
            type="button"
            onClick={() => void sendRequest()}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Envoyer la demande
          </Button>
        </div>
      </div>
    </div>
  );
}
