"use client";

import Link from "next/link";
import { CheckCircle2, Download, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { VehicleCheckDeleteDialog } from "@/components/business/vehicle-check-delete-dialog";
import { Button } from "@/components/ui/button";
import { downloadVehicleCheckPdf } from "@/lib/vehicle-check-pdf";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

type VehicleCheckActionsProps = {
  vehicleCheck: VehicleCheck;
  onCompleted: (vehicleCheck: VehicleCheck) => void;
};

export function VehicleCheckActions({ vehicleCheck, onCompleted }: VehicleCheckActionsProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const canComplete = vehicleCheck.status === "DRAFT";
  const canDelete = true;

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

  async function handleDownload() {
    setIsDownloading(true);
    try {
      await downloadVehicleCheckPdf(vehicleCheck);
      toast.success("PDF telecharge avec succes.");
    } catch {
      toast.error("Impossible de generer le PDF.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:items-end">
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            disabled={isDownloading}
            variant="outline"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            {isDownloading ? "Generation..." : "PDF"}
          </Button>
          <Button asChild className="w-full sm:w-auto" variant="outline">
            <Link href={`/dashboard/vehicle-checks/${vehicleCheck.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Link>
          </Button>
          {canDelete ? (
            <Button
              className="w-full sm:w-auto"
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          ) : null}
          <Button className="w-full sm:w-auto" disabled={!canComplete || isCompleting} onClick={handleComplete}>
            <CheckCircle2 className="h-4 w-4" />
            {isCompleting ? "Completion..." : "Completer"}
          </Button>
        </div>
      </div>
      <VehicleCheckDeleteDialog
        open={deleteDialogOpen}
        vehicleCheck={vehicleCheck}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => {
          router.push("/dashboard/vehicle-checks");
          router.refresh();
        }}
      />
    </>
  );
}
