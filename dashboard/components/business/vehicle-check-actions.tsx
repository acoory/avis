"use client";

import Link from "next/link";
import {
  CarFront,
  CheckCircle2,
  Download,
  MessageSquareText,
  Pencil,
  Trash2,
} from "lucide-react";
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

export function VehicleCheckActions({
  vehicleCheck,
  onSendRepairRequest,
  onUpdated,
}: VehicleCheckActionsProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [recoveredDialogOpen, setRecoveredDialogOpen] = useState(false);
  const canComplete = vehicleCheck.status === "DRAFT";
  const canRequestDecision =
    vehicleCheck.status !== "DRAFT" &&
    vehicleCheck.status !== "CLOSED_NO_DAMAGE" &&
    vehicleCheck.status !== "COMPLETED";
  const canDownloadSummary =
    vehicleCheck.status === "SUMMARY_READY" ||
    vehicleCheck.status === "CLOSED_NO_DAMAGE" ||
    vehicleCheck.status === "COMPLETED";
  const hasExternalProviderRepairs = (vehicleCheck.items ?? []).some(
    (item) =>
      item.selectedForSummary &&
      item.operationalStatus === "ACTIVE" &&
      item.executionMode === "EXTERNAL_PROVIDER",
  );
  const canConfirmDeposit =
    vehicleCheck.status === "SUMMARY_READY" && hasExternalProviderRepairs;
  const canEdit = vehicleCheck.status !== "COMPLETED";
  const canMarkRecovered = Boolean(
    vehicleCheck.status === "SUMMARY_READY" &&
      hasExternalProviderRepairs &&
      vehicleCheck.publicShare &&
      vehicleCheck.publicShare.takenInChargeAt &&
      !vehicleCheck.publicShare.vehicleRecoveredAt,
  );
  const canDelete = true;
  const latestDecisionShare = (vehicleCheck.decisionShares ?? []).reduce<
    NonNullable<VehicleCheck["decisionShares"]>[number] | null
  >(
    (latest, share) =>
      !latest || new Date(share.createdAt) > new Date(latest.createdAt)
        ? share
        : latest,
    null,
  );

  async function handleComplete() {
    setIsCompleting(true);

    try {
      const completed = await businessService.completeVehicleCheck(
        vehicleCheck.id,
      );
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
          {canDownloadSummary ? (
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
          {canConfirmDeposit ? (
            <Button
              className="w-full sm:w-auto"
              size="sm"
              type="button"
              onClick={onSendRepairRequest}
            >
              <CarFront className="h-4 w-4" />
              Confirmer le dépôt
            </Button>
          ) : null}
          {latestDecisionShare ? (
              <Button
                asChild
                className="w-full sm:w-auto"
                size="sm"
                variant="outline"
              >
                <Link href={`/public/decision/${latestDecisionShare.token}`}>
                  <MessageSquareText className="h-4 w-4" />
                  Consulter l&apos;avis
                </Link>
              </Button>
          ) : canRequestDecision ? (
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
          {canEdit || canDelete ? (
            <div className="col-span-2 flex items-center justify-end gap-1 sm:col-auto">
              {canEdit ? (
                <Button asChild className="h-8 w-8" size="icon" variant="ghost">
                  <Link
                    aria-label="Modifier le contrôle"
                    href={`/dashboard/vehicle-checks/${vehicleCheck.id}/edit`}
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  aria-label="Supprimer le contrôle"
                  className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                  size="icon"
                  title="Supprimer"
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          ) : null}
          {canComplete ? (
            <Button
              className="w-full sm:w-auto"
              disabled={isCompleting}
              size="sm"
              onClick={handleComplete}
            >
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
