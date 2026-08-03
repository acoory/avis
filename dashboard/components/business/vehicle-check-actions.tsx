"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Download,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ManagerDecisionRequestDialog } from "@/components/business/manager-decision-request-dialog";
import { VehicleCheckDeleteDialog } from "@/components/business/vehicle-check-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadVehicleCheckPdf } from "@/lib/vehicle-check-pdf";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

type VehicleCheckActionsProps = {
  compact?: boolean;
  vehicleCheck: VehicleCheck;
  onUpdated: (vehicleCheck: VehicleCheck) => void;
};

export function VehicleCheckActions({
  compact = false,
  vehicleCheck,
  onUpdated,
}: VehicleCheckActionsProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const canComplete = vehicleCheck.status === "DRAFT";
  const canRequestDecision =
    vehicleCheck.status !== "DRAFT" &&
    vehicleCheck.status !== "CLOSED_NO_DAMAGE" &&
    vehicleCheck.status !== "COMPLETED";
  const canDownloadSummary =
    vehicleCheck.status === "SUMMARY_READY" ||
    vehicleCheck.status === "CLOSED_NO_DAMAGE" ||
    vehicleCheck.status === "COMPLETED";
  const canEdit = vehicleCheck.status !== "COMPLETED";
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
      <div className={compact ? "flex shrink-0" : "flex flex-col gap-2 sm:items-end"}>
        {compact ? (
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Actions du contrôle"
                  className="h-9 w-9 p-0"
                  size="icon"
                  title="Actions"
                  type="button"
                  variant="outline"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canDownloadSummary ? (
                  <DropdownMenuItem
                    disabled={isDownloading}
                    onSelect={() => void handleDownload()}
                  >
                    <Download className="h-4 w-4" />
                    {isDownloading ? "Génération du PDF..." : "Télécharger le PDF"}
                  </DropdownMenuItem>
                ) : null}
                {latestDecisionShare ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/public/decision/${latestDecisionShare.token}`}>
                      <MessageSquareText className="h-4 w-4" />
                      Consulter l&apos;avis
                    </Link>
                  </DropdownMenuItem>
                ) : canRequestDecision ? (
                  <DropdownMenuItem onSelect={() => setDecisionDialogOpen(true)}>
                    <MessageSquareText className="h-4 w-4" />
                    Avis manager
                  </DropdownMenuItem>
                ) : null}
                {canComplete ? (
                  <DropdownMenuItem
                    disabled={isCompleting}
                    onSelect={() => void handleComplete()}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isCompleting ? "Finalisation..." : "Terminer le contrôle"}
                  </DropdownMenuItem>
                ) : null}
                {canEdit || canDelete ? <DropdownMenuSeparator /> : null}
                {canEdit ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/vehicle-checks/${vehicleCheck.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                      Modifier
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <DropdownMenuItem
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onSelect={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
        <div
          className={
            compact
              ? "hidden items-center justify-end gap-1 sm:flex"
              : "grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:max-w-xl sm:flex-wrap sm:justify-end"
          }
        >
          {canDownloadSummary ? (
            <Button
              aria-label="Télécharger le PDF"
              className={compact ? "h-9 w-9 p-0" : "w-full sm:w-auto"}
              disabled={isDownloading}
              size="sm"
              title={compact ? "Télécharger le PDF" : undefined}
              variant="outline"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              {compact ? (
                <span className="sr-only">{isDownloading ? "Génération..." : "PDF"}</span>
              ) : isDownloading ? (
                "Generation..."
              ) : (
                "PDF"
              )}
            </Button>
          ) : null}
          {latestDecisionShare ? (
              <Button
                asChild
                className={compact ? "h-9 w-9 p-0" : "w-full sm:w-auto"}
                size="sm"
                variant="outline"
              >
                <Link
                  aria-label="Consulter l'avis"
                  href={`/public/decision/${latestDecisionShare.token}`}
                  title={compact ? "Consulter l'avis" : undefined}
                >
                  <MessageSquareText className="h-4 w-4" />
                  {compact ? <span className="sr-only">Consulter l&apos;avis</span> : "Consulter l'avis"}
                </Link>
              </Button>
          ) : canRequestDecision ? (
              <Button
                aria-label="Demander un avis manager"
                className={compact ? "h-9 w-9 p-0" : "w-full sm:w-auto"}
                size="sm"
                title={compact ? "Avis manager" : undefined}
                type="button"
                variant="outline"
                onClick={() => setDecisionDialogOpen(true)}
              >
                <MessageSquareText className="h-4 w-4" />
                {compact ? <span className="sr-only">Avis manager</span> : "Avis manager"}
              </Button>
          ) : null}
          {canEdit || canDelete ? (
            <div className={compact ? "flex items-center gap-1" : "col-span-2 flex items-center justify-end gap-1 sm:col-auto"}>
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
              aria-label="Terminer le contrôle"
              className={compact ? "h-9 w-9 p-0" : "w-full sm:w-auto"}
              disabled={isCompleting}
              size="sm"
              title={compact ? "Terminer le contrôle" : undefined}
              onClick={handleComplete}
            >
              <CheckCircle2 className="h-4 w-4" />
              {compact ? (
                <span className="sr-only">Terminer le contrôle</span>
              ) : isCompleting ? (
                "Finalisation..."
              ) : (
                "Terminer le controle"
              )}
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
    </>
  );
}
