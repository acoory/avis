"use client";

import Link from "next/link";
import { CheckCircle2, Download, Mail, MessageSquareText, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ManagerDecisionRequestDialog } from "@/components/business/manager-decision-request-dialog";
import { VehicleCheckDeleteDialog } from "@/components/business/vehicle-check-delete-dialog";
import { VehicleRecoveredDialog } from "@/components/business/vehicle-recovered-dialog";
import { Button } from "@/components/ui/button";
import { downloadVehicleCheckPdf } from "@/lib/vehicle-check-pdf";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

type VehicleCheckActionsProps = {
  vehicleCheck: VehicleCheck;
  onSendRepairRequest: () => void;
  onUpdated: (vehicleCheck: VehicleCheck) => void;
};

export function VehicleCheckActions({ vehicleCheck, onSendRepairRequest, onUpdated }: VehicleCheckActionsProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [recoveredDialogOpen, setRecoveredDialogOpen] = useState(false);
  const canComplete = vehicleCheck.status === "DRAFT";
  const canRequestDecision = vehicleCheck.status !== "DRAFT";
  const canShareSummary = vehicleCheck.status === "SUMMARY_READY";
  const canMarkRecovered = Boolean(vehicleCheck.publicShare && !vehicleCheck.publicShare.vehicleRecoveredAt);
  const canDelete = true;

  async function handleComplete() {
    setIsCompleting(true);

    try {
      const completed = await businessService.completeVehicleCheck(vehicleCheck.id);
      onUpdated(completed);
      toast.success("Controle terrain termine. Il est maintenant a analyser.");
    } catch {
      toast.error("Impossible de terminer ce controle terrain.");
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
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:max-w-xl sm:flex-wrap sm:justify-end">
          {canShareSummary ? (
            <Button
              className="w-full sm:w-auto"
              disabled={isDownloading}
              size="sm"
              variant="outline"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "Generation..." : "PDF"}
            </Button>
          ) : null}
          {canShareSummary ? (
            <Button
              className="w-full sm:w-auto"
              size="sm"
              type="button"
              variant="outline"
              onClick={onSendRepairRequest}
            >
              <Mail className="h-4 w-4" />
              Envoyer par email
            </Button>
          ) : null}
          {canRequestDecision ? (
            <Button
              className="w-full sm:w-auto"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setDecisionDialogOpen(true)}
            >
              <MessageSquareText className="h-4 w-4" />
              Avis manager
            </Button>
          ) : null}
          {canMarkRecovered ? (
            <Button
              className="w-full sm:w-auto"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setRecoveredDialogOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Marquer recupere
            </Button>
          ) : null}
          <Button asChild className="w-full sm:w-auto" size="sm" variant="outline">
            <Link href={`/dashboard/vehicle-checks/${vehicleCheck.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Link>
          </Button>
          {canDelete ? (
            <Button
              className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 sm:w-auto"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          ) : null}
          {canComplete ? (
            <Button className="w-full sm:w-auto" disabled={isCompleting} size="sm" onClick={handleComplete}>
              <CheckCircle2 className="h-4 w-4" />
              {isCompleting ? "Finalisation..." : "Terminer le controle"}
            </Button>
          ) : null}
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
      <ManagerDecisionRequestDialog
        open={decisionDialogOpen}
        vehicleCheck={vehicleCheck}
        onOpenChange={setDecisionDialogOpen}
        onSent={onUpdated}
      />
      <VehicleRecoveredDialog
        open={recoveredDialogOpen}
        vehicleCheck={vehicleCheck}
        onOpenChange={setRecoveredDialogOpen}
        onRecovered={onUpdated}
      />
    </>
  );
}
