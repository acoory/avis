"use client";

import { CheckSquare2, Download, Mail, Maximize2, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DamagePhotoGallery } from "@/components/business/damage-photo-gallery";
import { RepairRequestEmailDialog } from "@/components/business/repair-request-email-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cloudinaryThumbnailUrl } from "@/lib/damage-photo";
import { downloadVehicleCheckPdf } from "@/lib/vehicle-check-pdf";
import { businessService } from "@/services/business.service";
import { PartOrderStatus, VehicleCheck, VehicleCheckItem } from "@/types/business";

type VehicleCheckSummarySelectionProps = {
  vehicleCheck: VehicleCheck;
  onUpdated: (vehicleCheck: VehicleCheck) => void;
};

export function VehicleCheckSummarySelection({ vehicleCheck, onUpdated }: VehicleCheckSummarySelectionProps) {
  const items = vehicleCheck.items ?? [];
  const isClosedWithoutDamage = vehicleCheck.status === "CLOSED_NO_DAMAGE";
  const isCompleted = vehicleCheck.status === "COMPLETED";
  const isSummaryPending = vehicleCheck.status === "TO_ANALYZE" && !vehicleCheck.summaryFinalizedAt;
  const isSummaryReady = vehicleCheck.status === "SUMMARY_READY" || isClosedWithoutDamage || isCompleted || Boolean(vehicleCheck.summaryFinalizedAt);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set(items.filter((item) => item.selectedForSummary).map((item) => item.id)));
  const [isSaving, setIsSaving] = useState(false);
  const [isPostValidationOpen, setIsPostValidationOpen] = useState(false);
  const [finalizedVehicleCheck, setFinalizedVehicleCheck] = useState<VehicleCheck | null>(null);
  const [isPreparingDocument, setIsPreparingDocument] = useState(false);
  const [partOrderSavingId, setPartOrderSavingId] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const finalizedWithoutDamage = finalizedVehicleCheck?.status === "CLOSED_NO_DAMAGE";
  const [photoGallery, setPhotoGallery] = useState<{
    photos: NonNullable<NonNullable<VehicleCheck["items"]>[number]["photos"]>;
    index: number;
    title: string;
  } | null>(null);

  useEffect(() => {
    setSelectedItemIds(new Set(items.filter((item) => item.selectedForSummary).map((item) => item.id)));
  }, [vehicleCheck.id, vehicleCheck.summaryFinalizedAt, items]);

  const selectedForbiddenCount = useMemo(
    () => items.filter((item) => selectedItemIds.has(item.id) && item.operationalStatus === "ACTIVE" && item.decisionStatus === "FORBIDDEN").length,
    [items, selectedItemIds],
  );

  function toggleItem(itemId: string) {
    setSelectedItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  async function updatePartOrder(item: VehicleCheckItem, partOrderStatus: Extract<PartOrderStatus, "TO_ORDER" | "ORDERED">) {
    setPartOrderSavingId(item.id);
    try {
      const updatedItem = await businessService.updatePartOrder(item.id, {
        partOrderRequired: true,
        partOrderStatus,
      });
      onUpdated({
        ...vehicleCheck,
        items: items.map((currentItem) => (currentItem.id === updatedItem.id ? { ...currentItem, ...updatedItem } : currentItem)),
      });
      toast.success(partOrderStatus === "ORDERED" ? "Pièce marquée comme commandée." : "Pièce remise à commander.");
    } catch {
      toast.error("Impossible de mettre à jour la commande pièce.");
    } finally {
      setPartOrderSavingId(null);
    }
  }

  async function saveSelection() {
    setIsSaving(true);
    try {
      const updated = await businessService.finalizeVehicleCheckSummary(vehicleCheck.id, [...selectedItemIds]);
      onUpdated(updated);
      setFinalizedVehicleCheck(updated);
      setIsPostValidationOpen(updated.status === "CLOSED_NO_DAMAGE");
      toast.success(updated.status === "CLOSED_NO_DAMAGE" ? "Controle terminé : aucune réparation retenue." : "Selection enregistree. La synthese est prete.");
    } catch {
      toast.error("Impossible de finaliser la synthese.");
    } finally {
      setIsSaving(false);
    }
  }

  async function downloadFinalizedPdf() {
    if (!finalizedVehicleCheck) return;
    setIsPreparingDocument(true);
    try {
      await downloadVehicleCheckPdf(finalizedVehicleCheck);
      toast.success("PDF telecharge.");
      setIsPostValidationOpen(false);
    } catch {
      toast.error("Impossible de generer le PDF.");
    } finally {
      setIsPreparingDocument(false);
    }
  }

  return (
    <Card className="mt-5 overflow-hidden border-gray-200 shadow-none" id="summary-selection">
      <CardHeader className="p-0">
        <div className="flex w-full flex-col gap-3 px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                isSummaryPending ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700",
              ].join(" ")}
            >
              <CheckSquare2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-950">{isClosedWithoutDamage ? "Controle terminé" : isCompleted ? "Synthese finale" : "Synthese"}</p>
              <p className="mt-0.5 text-sm leading-5 text-gray-500">
                {isClosedWithoutDamage
                  ? "Dossier terminé. Le vehicule est reste en station."
                  : isCompleted
                    ? "Dossier termine. La synthese est conservee en lecture seule."
                    : isSummaryPending
                      ? "Cochez les réparations à inclure dans le PDF et à transmettre au prestataire, puis validez."
                      : "Seules les réparations cochées seront incluses dans le PDF et transmises au prestataire lors du dépôt."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
            <span
              className={[
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                isSummaryPending
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : isSummaryReady
                    ? "border-teal-200 bg-teal-50 text-teal-800"
                    : "border-gray-200 bg-gray-50 text-gray-700",
              ].join(" ")}
            >
              {isClosedWithoutDamage ? "Terminé" : isCompleted ? "Terminé" : isSummaryPending ? "A realiser" : isSummaryReady ? "Prete" : "En attente"}
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
              {selectedItemIds.size}/{items.length} retenue{selectedItemIds.size > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-0 border-t border-gray-200 p-0">
        {items.length ? (
          <div className="divide-y divide-gray-200">
            {items.map((item) => {
              const checked = selectedItemIds.has(item.id);

              return (
                <label
                  className={[
                    "flex gap-3 px-4 py-3 transition-colors",
                    isCompleted ? "cursor-default" : "cursor-pointer",
                    checked ? "bg-teal-50/70" : "bg-white hover:bg-gray-50",
                  ].join(" ")}
                  key={item.id}
                >
                  <input
                    checked={checked}
                    className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
                    disabled={isCompleted}
                    type="checkbox"
                    onChange={() => toggleItem(item.id)}
                  />
                  {item.photos?.length ? (
                    <span className="flex shrink-0 gap-1">
                      {item.photos.map((photo, photoIndex) => (
                        <button
                          aria-label="Voir la photo en grand"
                          className="group relative h-12 w-12 overflow-hidden rounded-md border border-gray-200"
                          key={photo.publicId}
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setPhotoGallery({
                              photos: item.photos ?? [],
                              index: photoIndex,
                              title: item.vehiclePart.name,
                            });
                          }}
                        >
                          <img alt="Degat" className="h-full w-full object-cover" decoding="async" loading="lazy" src={cloudinaryThumbnailUrl(photo, 160)} />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white transition-colors group-hover:bg-black/35">
                            <Maximize2 className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                          </span>
                        </button>
                      ))}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-950">{item.vehiclePart.name}</span>
                    <span className="block text-sm text-gray-500">
                      {item.repairType.name} · Quantite {item.quantity}
                    </span>
                    {item.comment?.trim() ? <span className="mt-1 block text-xs text-gray-500">{item.comment}</span> : null}
                    {item.decisionStatus === "FORBIDDEN" ? (
                      <span className="mt-1 block text-xs font-medium text-red-700">Reparation interdite : elle doit etre decochee pour finaliser.</span>
                    ) : null}
                    {checked && item.partOrderRequired && item.operationalStatus === "ACTIVE" && isSummaryReady ? (
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "inline-flex rounded-md px-2 py-1 text-xs font-medium",
                            item.partOrderStatus === "ORDERED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900",
                          ].join(" ")}
                        >
                          {item.partOrderStatus === "ORDERED" ? "Pièce commandée" : "Pièce à commander"}
                        </span>
                        {!isCompleted ? (
                          <Button
                            disabled={partOrderSavingId === item.id}
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void updatePartOrder(item, item.partOrderStatus === "ORDERED" ? "TO_ORDER" : "ORDERED");
                            }}
                          >
                            {partOrderSavingId === item.id ? "Mise à jour..." : item.partOrderStatus === "ORDERED" ? "Remettre à commander" : "Marquer commandée"}
                          </Button>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="m-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            {isClosedWithoutDamage
              ? "Aucune réparation retenue. Le prestataire et la recuperation ne sont pas applicables."
              : "Aucun dommage n'a ete reference. Valide pour terminer directement le controle."}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-5 text-gray-500">
            {isClosedWithoutDamage
              ? "Le vehicule reste en station et le dossier est termine."
              : isCompleted
                ? "Le vehicule a ete recupere. Le dossier ne peut plus etre modifie."
                : items.length
                  ? "Les réparations décochées restent enregistrées dans le contrôle, mais ne sont ni ajoutées au PDF ni transmises au prestataire."
                  : "Aucune demande prestataire ni recuperation ne sera creee."}
          </p>
          {!isClosedWithoutDamage && !isCompleted ? (
            <Button className="w-full sm:w-auto" disabled={isSaving || selectedForbiddenCount > 0} size="sm" type="button" onClick={saveSelection}>
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckSquare2 className="h-4 w-4" />}
              {!items.length ? "Valider et terminer" : vehicleCheck.status === "SUMMARY_READY" ? "Enregistrer la selection" : "Valider la synthese"}
            </Button>
          ) : null}
        </div>
      </CardContent>
      {photoGallery?.photos.length ? (
        <DamagePhotoGallery
          index={photoGallery.index}
          photos={photoGallery.photos}
          title={photoGallery.title}
          onClose={() => setPhotoGallery(null)}
          onIndexChange={(index) => setPhotoGallery((current) => (current ? { ...current, index } : current))}
        />
      ) : null}
      {isPostValidationOpen && finalizedVehicleCheck ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={finalizedWithoutDamage ? "Controle termine" : "Synthese prete"}
          onClick={() => setIsPostValidationOpen(false)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">{finalizedWithoutDamage ? "Controle termine" : "Synthese prete"}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {finalizedWithoutDamage
                    ? "Aucune réparation retenue. Le vehicule reste en station et aucune autre etape n'est requise."
                    : "Que souhaites-tu faire maintenant ?"}
                </p>
              </div>
              <button
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                type="button"
                onClick={() => setIsPostValidationOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className={["mt-5 grid gap-2", finalizedWithoutDamage ? "" : "sm:grid-cols-2"].join(" ")}>
              <Button disabled={isPreparingDocument} type="button" variant="outline" onClick={downloadFinalizedPdf}>
                <Download className="h-4 w-4" />
                Telecharger le PDF
              </Button>
              {!finalizedWithoutDamage ? (
                <Button
                  disabled={isPreparingDocument}
                  type="button"
                  onClick={() => {
                    setIsPostValidationOpen(false);
                    setEmailDialogOpen(true);
                  }}
                >
                  <Mail className="h-4 w-4" />
                  Envoyer par email
                </Button>
              ) : null}
            </div>
            <Button className="mt-2 w-full" disabled={isPreparingDocument} type="button" variant="ghost" onClick={() => setIsPostValidationOpen(false)}>
              {finalizedWithoutDamage ? "Fermer" : "Plus tard"}
            </Button>
          </div>
        </div>
      ) : null}
      {finalizedVehicleCheck?.status === "SUMMARY_READY" ? (
        <RepairRequestEmailDialog open={emailDialogOpen} vehicleCheck={finalizedVehicleCheck} onOpenChange={setEmailDialogOpen} />
      ) : null}
    </Card>
  );
}
