"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatLicensePlate } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

type VehicleRecoveredDialogProps = {
  onOpenChange: (open: boolean) => void;
  onRecovered?: (vehicleCheck: VehicleCheck) => void;
  open: boolean;
  vehicleCheck: VehicleCheck | null;
};

export function VehicleRecoveredDialog({
  onOpenChange,
  onRecovered,
  open,
  vehicleCheck,
}: VehicleRecoveredDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  if (!open || !vehicleCheck) {
    return null;
  }

  const selectedVehicleCheck = vehicleCheck;
  const vehicleLabel = formatLicensePlate(
    selectedVehicleCheck.licensePlate,
    selectedVehicleCheck.licensePlateCountry,
    selectedVehicleCheck.licensePlateRaw,
  );
  const pendingPartOrdersCount = (selectedVehicleCheck.items ?? []).filter(
    (item) =>
      item.selectedForSummary &&
      item.operationalStatus === "ACTIVE" &&
      item.partOrderRequired &&
      item.partOrderStatus === "TO_ORDER",
  ).length;

  function closeDialog() {
    if (!isSaving) {
      onOpenChange(false);
    }
  }

  async function confirmRecovered() {
    setIsSaving(true);
    try {
      const updated = await businessService.markVehicleRecovered(selectedVehicleCheck.id);
      toast.success(
        updated.status === "COMPLETED"
          ? "Vehicule recupere. Le dossier est termine."
          : "Vehicule recupere. Les reparations sur place restent a terminer.",
      );
      onRecovered?.(updated);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        apiErrorCode(error) === "VEHICLE_CHECK_PENDING_PART_ORDERS"
          ? "Finalisez les commandes de pieces avant de recuperer le vehicule."
          : "Impossible de marquer le vehicule comme recupere.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      aria-labelledby="recover-vehicle-check-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      onClick={closeDialog}
    >
      <div
        className="w-full rounded-t-xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-950" id="recover-vehicle-check-title">
                Marquer le vehicule comme recupere ?
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Le vehicule <span className="font-medium text-gray-950">{vehicleLabel}</span> passera au statut{" "}
                <span className="font-medium text-gray-950">Terminé</span>. Cette action cloture le suivi prestataire.
              </p>
            </div>
          </div>
          <Button aria-label="Fermer" disabled={isSaving} size="icon" type="button" variant="ghost" onClick={closeDialog}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {pendingPartOrdersCount > 0 ? (
          <div className="mt-4 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {pendingPartOrdersCount} piece{pendingPartOrdersCount > 1 ? "s" : ""} reste{pendingPartOrdersCount > 1 ? "nt" : ""} a commander. Finalisez {pendingPartOrdersCount > 1 ? "ces commandes" : "cette commande"} avant la recuperation.
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={isSaving} type="button" variant="outline" onClick={closeDialog}>
            Annuler
          </Button>
          <Button disabled={isSaving || pendingPartOrdersCount > 0} type="button" onClick={confirmRecovered}>
            <CheckCircle2 className="h-4 w-4" />
            {isSaving ? "Validation..." : "Confirmer et terminer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function apiErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const response = (error as { response?: { data?: { code?: unknown } } }).response;
  return typeof response?.data?.code === "string" ? response.data.code : null;
}
