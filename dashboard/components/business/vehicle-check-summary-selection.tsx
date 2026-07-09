"use client";

import {
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  Maximize2,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RepairRequestEmailDialog } from "@/components/business/repair-request-email-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cloudinaryPreviewUrl, cloudinaryThumbnailUrl } from "@/lib/damage-photo";
import { downloadVehicleCheckPdf } from "@/lib/vehicle-check-pdf";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

type VehicleCheckSummarySelectionProps = {
  vehicleCheck: VehicleCheck;
  onUpdated: (vehicleCheck: VehicleCheck) => void;
};

export function VehicleCheckSummarySelection({
  vehicleCheck,
  onUpdated,
}: VehicleCheckSummarySelectionProps) {
  const items = vehicleCheck.items ?? [];
  const isSummaryPending = vehicleCheck.status === "TO_ANALYZE" && !vehicleCheck.summaryFinalizedAt;
  const isSummaryReady = vehicleCheck.status === "SUMMARY_READY" || Boolean(vehicleCheck.summaryFinalizedAt);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(items.filter((item) => item.selectedForSummary).map((item) => item.id)),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPostValidationOpen, setIsPostValidationOpen] = useState(false);
  const [finalizedVehicleCheck, setFinalizedVehicleCheck] = useState<VehicleCheck | null>(null);
  const [isPreparingDocument, setIsPreparingDocument] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [photoGallery, setPhotoGallery] = useState<{
    photos: NonNullable<NonNullable<VehicleCheck["items"]>[number]["photos"]>;
    index: number;
  } | null>(null);

  useEffect(() => {
    setSelectedItemIds(
      new Set(items.filter((item) => item.selectedForSummary).map((item) => item.id)),
    );
  }, [vehicleCheck.id, vehicleCheck.summaryFinalizedAt, items]);

  useEffect(() => {
    if (!photoGallery) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPhotoGallery(null);
      } else if (event.key === "ArrowLeft") {
        setPhotoGallery((current) =>
          current
            ? {
                ...current,
                index: (current.index - 1 + current.photos.length) % current.photos.length,
              }
            : current,
        );
      } else if (event.key === "ArrowRight") {
        setPhotoGallery((current) =>
          current
            ? { ...current, index: (current.index + 1) % current.photos.length }
            : current,
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photoGallery]);

  useEffect(() => {
    if (!photoGallery?.photos.length) {
      return;
    }

    preloadGalleryPhotos(photoGallery.photos, photoGallery.index);
  }, [photoGallery?.index, photoGallery?.photos]);

  const selectedForbiddenCount = useMemo(
    () =>
      items.filter(
        (item) =>
          selectedItemIds.has(item.id) &&
          item.operationalStatus === "ACTIVE" &&
          item.decisionStatus === "FORBIDDEN",
      ).length,
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

  async function saveSelection() {
    setIsSaving(true);
    try {
      const updated = await businessService.finalizeVehicleCheckSummary(
        vehicleCheck.id,
        [...selectedItemIds],
      );
      onUpdated(updated);
      setFinalizedVehicleCheck(updated);
      setIsPostValidationOpen(true);
      toast.success("Selection enregistree. La synthese est prete.");
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
              <p className="text-base font-semibold text-gray-950">Synthese</p>
              <p className="mt-0.5 text-sm leading-5 text-gray-500">
                {isSummaryPending
                  ? "Verifie les reparations preselectionnees, puis valide."
                  : "Les reparations retenues peuvent encore etre ajustees."}
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
              {isSummaryPending ? "A realiser" : isSummaryReady ? "Prete" : "En attente"}
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
              {selectedItemIds.size}/{items.length} selectionnee{selectedItemIds.size > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-0 border-t border-gray-200 p-0">
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
              <span
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                  isSummaryPending ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700",
                ].join(" ")}
              >
                <CheckSquare2 className="h-3.5 w-3.5" />
              </span>
              {isSummaryPending ? "Synthese a realiser" : "Reparations a inclure"}
            </div>
            <p className="mt-1 text-sm leading-5 text-gray-500">
              {isSummaryPending
                ? "Verifie les reparations preselectionnees, puis valide la synthese."
                : "Selectionne les dommages qui doivent apparaitre dans le PDF."}
            </p>
          </div>
          {items.length ? (
            <div className="divide-y divide-gray-200">
              {items.map((item) => {
                const checked = selectedItemIds.has(item.id);

                return (
                  <label
                    className={[
                      "flex cursor-pointer gap-3 px-4 py-3 transition-colors",
                      checked
                        ? "bg-teal-50/70"
                        : "bg-white hover:bg-gray-50",
                    ].join(" ")}
                    key={item.id}
                  >
                    <input
                      checked={checked}
                      className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
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
                              });
                            }}
                          >
                            <img
                              alt="Degat"
                              className="h-full w-full object-cover"
                              decoding="async"
                              loading="lazy"
                              src={cloudinaryThumbnailUrl(photo, 160)}
                            />
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
                      {item.comment?.trim() ? (
                        <span className="mt-1 block text-xs text-gray-500">{item.comment}</span>
                      ) : null}
                      {item.decisionStatus === "FORBIDDEN" ? (
                        <span className="mt-1 block text-xs font-medium text-red-700">
                          Reparation interdite : elle doit etre decochee pour finaliser.
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="m-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Aucun dommage n&apos;a ete reference. Tu peux tout de meme finaliser une synthese vide.
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-5 text-gray-500">
              Les dommages decoches restent dans le controle, hors PDF.
            </p>
            <Button
              className="w-full sm:w-auto"
              disabled={isSaving || selectedForbiddenCount > 0}
              size="sm"
              type="button"
              onClick={saveSelection}
            >
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckSquare2 className="h-4 w-4" />}
              {vehicleCheck.status === "SUMMARY_READY"
                ? "Enregistrer la selection"
                : "Valider la synthese"}
            </Button>
          </div>
      </CardContent>
      {photoGallery?.photos.length ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo du dommage"
          onClick={() => setPhotoGallery(null)}
        >
          <button
            aria-label="Fermer la photo"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg"
            type="button"
            onClick={() => setPhotoGallery(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {photoGallery.photos.length > 1 ? (
            <>
              <button
                aria-label="Photo precedente"
                className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-950 shadow-lg hover:bg-white md:left-6"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPhotoGallery((current) =>
                    current
                      ? {
                          ...current,
                          index:
                            (current.index - 1 + current.photos.length) %
                            current.photos.length,
                        }
                      : current,
                  );
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                aria-label="Photo suivante"
                className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-950 shadow-lg hover:bg-white md:right-6"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPhotoGallery((current) =>
                    current
                      ? { ...current, index: (current.index + 1) % current.photos.length }
                      : current,
                  );
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-sm font-medium text-white">
                {photoGallery.index + 1} / {photoGallery.photos.length}
              </div>
            </>
          ) : null}
          <img
            alt="Degat du vehicule en grand"
            className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
            decoding="async"
            src={cloudinaryPreviewUrl(photoGallery.photos[photoGallery.index])}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
      {isPostValidationOpen && finalizedVehicleCheck ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Synthese prete"
          onClick={() => setIsPostValidationOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">Synthese prete</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Que souhaites-tu faire maintenant ?
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
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button
                disabled={isPreparingDocument}
                type="button"
                variant="outline"
                onClick={downloadFinalizedPdf}
              >
                <Download className="h-4 w-4" />
                Telecharger le PDF
              </Button>
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
            </div>
            <Button
              className="mt-2 w-full"
              disabled={isPreparingDocument}
              type="button"
              variant="ghost"
              onClick={() => setIsPostValidationOpen(false)}
            >
              Plus tard
            </Button>
          </div>
        </div>
      ) : null}
      {finalizedVehicleCheck ? (
        <RepairRequestEmailDialog
          open={emailDialogOpen}
          vehicleCheck={finalizedVehicleCheck}
          onOpenChange={setEmailDialogOpen}
        />
      ) : null}
    </Card>
  );
}

function preloadGalleryPhotos(
  photos: NonNullable<NonNullable<VehicleCheck["items"]>[number]["photos"]>,
  index: number,
) {
  const indexes = new Set([
    index,
    (index - 1 + photos.length) % photos.length,
    (index + 1) % photos.length,
  ]);

  indexes.forEach((photoIndex) => {
    const photo = photos[photoIndex];
    if (!photo) return;
    const image = new Image();
    image.src = cloudinaryPreviewUrl(photo);
  });
}
