"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatLicensePlate } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

type VehicleCheckDeleteDialogProps = {
  open: boolean;
  vehicleCheck: VehicleCheck | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (vehicleCheck: VehicleCheck) => void;
};

export function VehicleCheckDeleteDialog({
  open,
  vehicleCheck,
  onOpenChange,
  onDeleted,
}: VehicleCheckDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorVehicleCheckId, setErrorVehicleCheckId] = useState<string | null>(null);

  if (!open || !vehicleCheck) {
    return null;
  }

  const selectedVehicleCheck = vehicleCheck;
  const vehicleLabel = formatLicensePlate(
    selectedVehicleCheck.licensePlate,
    selectedVehicleCheck.licensePlateCountry,
    selectedVehicleCheck.licensePlateRaw,
  );
  const visibleErrorMessage = errorVehicleCheckId === selectedVehicleCheck.id ? errorMessage : "";

  function closeDialog() {
    if (!isDeleting) {
      setErrorMessage("");
      setErrorVehicleCheckId(null);
      onOpenChange(false);
    }
  }

  async function confirmDelete() {
    setIsDeleting(true);
    setErrorMessage("");
    setErrorVehicleCheckId(null);

    try {
      await businessService.deleteVehicleCheck(selectedVehicleCheck.id);
      toast.success("Vehicule supprime avec succes.");
      setIsDeleting(false);
      setErrorMessage("");
      setErrorVehicleCheckId(null);
      onDeleted?.(selectedVehicleCheck);
      onOpenChange(false);
    } catch {
      const message = "Impossible de supprimer ce vehicule.";
      setErrorMessage(message);
      setErrorVehicleCheckId(selectedVehicleCheck.id);
      toast.error(message);
      setIsDeleting(false);
    }
  }

  return (
    <div
      aria-labelledby="delete-vehicle-check-title"
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-950" id="delete-vehicle-check-title">
                Supprimer ce vehicule ?
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Cette action supprimera le vehicule <span className="font-medium text-gray-950">{vehicleLabel}</span>{" "}
                et son controle {selectedVehicleCheck.checkNumber}.
              </p>
            </div>
          </div>
          <Button aria-label="Fermer" disabled={isDeleting} size="icon" type="button" variant="ghost" onClick={closeDialog}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {visibleErrorMessage ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {visibleErrorMessage}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={isDeleting} type="button" variant="outline" onClick={closeDialog}>
            Annuler
          </Button>
          <Button disabled={isDeleting} type="button" variant="destructive" onClick={confirmDelete}>
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
