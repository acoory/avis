"use client";

import Link from "next/link";
import { CheckCircle2, Pencil, Printer, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

type VehicleCheckActionsProps = {
  vehicleCheck: VehicleCheck;
  onCompleted: (vehicleCheck: VehicleCheck) => void;
};

export function VehicleCheckActions({ vehicleCheck, onCompleted }: VehicleCheckActionsProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const canComplete = vehicleCheck.status === "DRAFT";
  const canDelete = vehicleCheck.status === "DRAFT";

  async function handleComplete() {
    setIsCompleting(true);

    try {
      const completed = await businessService.completeVehicleCheck(vehicleCheck.id);
      onCompleted(completed);
      toast.success("Controle complete avec succes.");
    } catch {
      toast.error("Impossible de completer ce controle. Verifie les reparations interdites.");
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Supprimer ce controle brouillon ?");
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await businessService.deleteVehicleCheck(vehicleCheck.id);
      toast.success("Controle brouillon supprime avec succes.");
      router.push("/dashboard/vehicle-checks");
      router.refresh();
    } catch {
      toast.error("Impossible de supprimer ce controle.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link
            href={`/dashboard/vehicle-checks/${vehicleCheck.id}/print?autoprint=1`}
            rel="noreferrer"
            target="_blank"
          >
            <Printer className="h-4 w-4" />
            PDF
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/vehicle-checks/${vehicleCheck.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Link>
        </Button>
        {canDelete ? (
          <Button disabled={isDeleting} variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Suppression..." : "Supprimer"}
          </Button>
        ) : null}
        <Button disabled={!canComplete || isCompleting} onClick={handleComplete}>
          <CheckCircle2 className="h-4 w-4" />
          {isCompleting ? "Completion..." : "Completer"}
        </Button>
      </div>
    </div>
  );
}
