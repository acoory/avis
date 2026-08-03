"use client";

import { CarFront, CheckCircle2, CheckSquare2, ChevronDown, Clock, Download, Info, Mail, Maximize2, Package, Pencil, RefreshCw, Wrench, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DamagePhotoGallery } from "@/components/business/damage-photo-gallery";
import { RepairRequestEmailDialog } from "@/components/business/repair-request-email-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cloudinaryThumbnailUrl } from "@/lib/damage-photo";
import { downloadVehicleCheckPdf } from "@/lib/vehicle-check-pdf";
import { businessService } from "@/services/business.service";
import { PartOrderStatus, RepairExecutionMode, VehicleCheck, VehicleCheckItem } from "@/types/business";

type VehicleCheckSummarySelectionProps = {
  vehicleCheck: VehicleCheck;
  onUpdated: (vehicleCheck: VehicleCheck) => void;
};

export function VehicleCheckSummarySelection({ vehicleCheck, onUpdated }: VehicleCheckSummarySelectionProps) {
  const items = useMemo(() => vehicleCheck.items ?? [], [vehicleCheck.items]);
  const isClosedWithoutDamage = vehicleCheck.status === "CLOSED_NO_DAMAGE";
  const isCompleted = vehicleCheck.status === "COMPLETED";
  const isSummaryPending = vehicleCheck.status === "TO_ANALYZE" && !vehicleCheck.summaryFinalizedAt;
  const isSummaryReady = vehicleCheck.status === "SUMMARY_READY" || isClosedWithoutDamage || isCompleted || Boolean(vehicleCheck.summaryFinalizedAt);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set(items.filter((item) => item.selectedForSummary).map((item) => item.id)));
  const [executionModes, setExecutionModes] = useState<Record<string, RepairExecutionMode | null>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.executionMode ?? null])),
  );
  const [editingExecutionModeItemIds, setEditingExecutionModeItemIds] = useState<Set<string>>(() => new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isPostValidationOpen, setIsPostValidationOpen] = useState(false);
  const [finalizedVehicleCheck, setFinalizedVehicleCheck] = useState<VehicleCheck | null>(null);
  const [isPreparingDocument, setIsPreparingDocument] = useState(false);
  const [partOrderSavingId, setPartOrderSavingId] = useState<string | null>(null);
  const [executionSavingId, setExecutionSavingId] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const finalizedWithoutDamage = finalizedVehicleCheck?.status === "CLOSED_NO_DAMAGE";
  const [photoGallery, setPhotoGallery] = useState<{
    photos: NonNullable<NonNullable<VehicleCheck["items"]>[number]["photos"]>;
    index: number;
    title: string;
  } | null>(null);

  const selectedForbiddenCount = useMemo(
    () => items.filter((item) => selectedItemIds.has(item.id) && item.operationalStatus === "ACTIVE" && item.decisionStatus === "FORBIDDEN").length,
    [items, selectedItemIds],
  );
  const isSelectionChanged = useMemo(() => {
    const savedItemIds = new Set(
      items.filter((item) => item.selectedForSummary).map((item) => item.id),
    );
    const hasExecutionModeChange = items.some(
      (item) =>
        selectedItemIds.has(item.id) &&
        (item.executionMode ?? null) !== (executionModes[item.id] ?? null),
    );
    return (
      savedItemIds.size !== selectedItemIds.size ||
      [...selectedItemIds].some((itemId) => !savedItemIds.has(itemId)) ||
      hasExecutionModeChange
    );
  }, [executionModes, items, selectedItemIds]);
  const selectedWithoutExecutionModeCount = useMemo(
    () => [...selectedItemIds].filter((itemId) => !executionModes[itemId]).length,
    [executionModes, selectedItemIds],
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

  function selectExecutionMode(itemId: string, executionMode: RepairExecutionMode) {
    setExecutionModes((current) => ({ ...current, [itemId]: executionMode }));
    setEditingExecutionModeItemIds((current) => {
      const next = new Set(current);
      next.delete(itemId);
      return next;
    });
  }

  function editExecutionMode(itemId: string) {
    setEditingExecutionModeItemIds((current) => new Set(current).add(itemId));
  }

  async function updatePartOrder(item: VehicleCheckItem, partOrderStatus: Extract<PartOrderStatus, "TO_ORDER" | "ORDERED">) {
    setPartOrderSavingId(item.id);
    try {
      const updatedItem = await businessService.updatePartOrder(item.id, {
        partOrderRequired: true,
        partOrderStatus,
      });
      let updatedVehicleCheck: VehicleCheck;
      if (partOrderStatus === "ORDERED") {
        const refreshedVehicleCheck = await businessService.vehicleCheck(vehicleCheck.id);
        const refreshedItems = refreshedVehicleCheck.items ?? [];
        const refreshedItemsById = new Map(refreshedItems.map((refreshedItem) => [refreshedItem.id, refreshedItem]));
        const currentItemIds = new Set(items.map((currentItem) => currentItem.id));

        updatedVehicleCheck = {
          ...refreshedVehicleCheck,
          items: [
            ...items.map((currentItem) => refreshedItemsById.get(currentItem.id) ?? currentItem),
            ...refreshedItems.filter((refreshedItem) => !currentItemIds.has(refreshedItem.id)),
          ],
        };
      } else {
        updatedVehicleCheck = {
          ...vehicleCheck,
          items: items.map((currentItem) =>
            currentItem.id === updatedItem.id
              ? { ...currentItem, ...updatedItem }
              : currentItem,
          ),
        };
      }
      onUpdated(updatedVehicleCheck);
      toast.success(
        updatedVehicleCheck.status === "COMPLETED"
          ? "Pièce commandée. Toutes les interventions sont terminées."
          : partOrderStatus === "ORDERED"
            ? "Pièce marquée comme commandée."
            : "Pièce remise à commander.",
      );
    } catch {
      toast.error("Impossible de mettre à jour la commande pièce.");
    } finally {
      setPartOrderSavingId(null);
    }
  }

  async function updateExecutionStatus(item: VehicleCheckItem) {
    setExecutionSavingId(item.id);
    const completed = !item.executionCompletedAt;
    try {
      await businessService.updateVehicleCheckItemExecutionStatus(item.id, completed);
      const updatedVehicleCheck = await businessService.vehicleCheck(vehicleCheck.id);
      onUpdated(updatedVehicleCheck);
      toast.success(
        updatedVehicleCheck.status === "COMPLETED"
          ? "Toutes les interventions sont terminées. Le dossier est clôturé."
          : completed
            ? "Réparation sur place marquée comme terminée."
            : "Réparation sur place remise à faire.",
      );
    } catch {
      toast.error("Impossible de mettre à jour la réparation sur place.");
    } finally {
      setExecutionSavingId(null);
    }
  }

  async function saveSelection() {
    setIsSaving(true);
    try {
      const updated = await businessService.finalizeVehicleCheckSummary(
        vehicleCheck.id,
        [...selectedItemIds].map((itemId) => ({
          executionMode: executionModes[itemId] as RepairExecutionMode,
          id: itemId,
        })),
      );
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
        <div className="flex w-full flex-col gap-3 bg-gradient-to-r from-teal-900 to-teal-800 px-5 py-2.5 text-left text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/60 bg-white/10 text-white shadow-sm">
              <CheckSquare2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{isClosedWithoutDamage ? "Contrôle terminé" : isCompleted ? "Synthèse finale" : "Synthèse"}</p>
              <p className="text-xs leading-4 text-teal-50/90 sm:truncate">
                {isClosedWithoutDamage
                  ? "Dossier terminé. Le véhicule est resté en station."
                  : isCompleted
                    ? "Dossier terminé. La synthèse est conservée en lecture seule."
                    : isSummaryPending
                      ? "Cochez les réparations retenues et choisissez pour chacune si elle sera effectuée sur place ou chez un prestataire."
                      : "Chaque réparation retenue indique maintenant son lieu d’intervention. Seules celles destinées au prestataire lui seront transmises."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold",
                isSummaryPending
                  ? "border-amber-200/40 bg-amber-400/20 text-amber-50"
                  : "border-white/20 bg-white/10 text-white",
              ].join(" ")}
            >
              {isSummaryReady ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              {isClosedWithoutDamage ? "Terminé" : isCompleted ? "Terminé" : isSummaryPending ? "À réaliser" : isSummaryReady ? "Prête" : "En attente"}
            </span>
            <span className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10">
              {selectedItemIds.size}/{items.length} retenue{selectedItemIds.size > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        {items.length ? (
          <div className="relative divide-y divide-gray-200">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-6 left-9 top-6 z-10 border-l border-dashed border-gray-300"
            />
            {items.map((item) => {
              const checked = selectedItemIds.has(item.id);
              const executionMode = executionModes[item.id];
              const isEditingExecutionMode = editingExecutionModeItemIds.has(item.id);
              const showsOnSiteStatus = checked && executionMode === "ON_SITE" && isSummaryReady;
              const showsPartOrderStatus = item.partOrderRequired && item.operationalStatus === "ACTIVE";

              return (
                <div
                  className={[
                    "relative flex items-start gap-2.5 px-5 py-2 transition-colors lg:items-center",
                    checked
                      ? showsPartOrderStatus && item.partOrderStatus === "TO_ORDER"
                        ? "bg-orange-50/20"
                        : "bg-white"
                      : "bg-gray-50/40 hover:bg-gray-50",
                  ].join(" ")}
                  key={item.id}
                >
                  <span
                    className={[
                      "relative z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      checked
                        ? showsPartOrderStatus && item.partOrderStatus === "TO_ORDER"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-teal-50 text-teal-700"
                        : "bg-gray-100 text-gray-500",
                    ].join(" ")}
                  >
                    <input
                      aria-label={`Retenir ${item.vehiclePart.name}`}
                      checked={checked}
                      className="h-4 w-4 shrink-0 accent-teal-700"
                      disabled={isCompleted}
                      type="checkbox"
                      onChange={() => toggleItem(item.id)}
                    />
                  </span>
                  {item.photos?.length ? (
                    <button
                      aria-label={`Voir les ${item.photos.length} photo${item.photos.length > 1 ? "s" : ""} de ${item.vehiclePart.name}`}
                      className="group relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100 shadow-sm"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setPhotoGallery({
                          photos: item.photos ?? [],
                          index: 0,
                          title: item.vehiclePart.name,
                        });
                      }}
                    >
                      <img
                        alt={`Degat ${item.vehiclePart.name}`}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        decoding="async"
                        loading="lazy"
                        src={cloudinaryThumbnailUrl(item.photos[0], 240)}
                      />
                      <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <Maximize2 className="h-3 w-3" />
                      </span>
                      <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1 text-center text-[10px] font-semibold leading-none text-white">
                        {item.photos.length} photo{item.photos.length > 1 ? "s" : ""}
                      </span>
                    </button>
                  ) : null}
                  <div className="min-w-0 flex-1 lg:grid lg:grid-cols-[minmax(190px,.75fr)_minmax(190px,.7fr)_minmax(420px,1.55fr)] lg:items-center lg:gap-4 2xl:grid-cols-[minmax(220px,.65fr)_minmax(220px,.6fr)_minmax(620px,1.75fr)] 2xl:gap-5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-5 text-gray-950">{item.vehiclePart.name}</p>
                      <p className="text-xs leading-4 text-gray-500">
                        {item.repairType.name} · Quantité {item.quantity}
                      </p>
                      {item.comment?.trim() ? <p className="mt-1 text-xs text-gray-500">{item.comment}</p> : null}
                      {item.decisionStatus === "FORBIDDEN" ? (
                        <p className="mt-1 text-xs font-medium text-red-700">Réparation interdite : elle doit être décochée pour finaliser.</p>
                      ) : null}
                    </div>

                    {checked ? (
                      <div className="mt-3 min-w-0 lg:mt-0">
                        <p className="mb-1 text-[11px] font-medium leading-4 text-gray-500">Lieu d’intervention</p>
                        {!executionMode || isEditingExecutionMode ? (
                          <>
                            <div className="flex flex-wrap gap-2" role="group" aria-label={`Lieu de l'intervention pour ${item.vehiclePart.name}`}>
                              <Button
                                aria-pressed={executionMode === "ON_SITE"}
                                className={`h-8 px-2.5 text-xs ${executionMode === "ON_SITE" ? "border-teal-700 bg-teal-700 text-white hover:bg-teal-800" : ""}`}
                                disabled={isCompleted}
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => selectExecutionMode(item.id, "ON_SITE")}
                              >
                                <Wrench className="h-3.5 w-3.5" />
                                Sur place
                              </Button>
                              <Button
                                aria-pressed={executionMode === "EXTERNAL_PROVIDER"}
                                className={`h-8 px-2.5 text-xs ${executionMode === "EXTERNAL_PROVIDER" ? "border-teal-700 bg-teal-700 text-white hover:bg-teal-800" : ""}`}
                                disabled={isCompleted}
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => selectExecutionMode(item.id, "EXTERNAL_PROVIDER")}
                              >
                                <CarFront className="h-3.5 w-3.5" />
                                Chez un prestataire
                              </Button>
                            </div>
                            {!executionMode ? (
                              <p className="mt-1.5 text-xs font-medium text-amber-700">Choisis un lieu avant de valider.</p>
                            ) : null}
                          </>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
                              {executionMode === "ON_SITE" ? <Wrench className="h-3.5 w-3.5" /> : <CarFront className="h-3.5 w-3.5" />}
                              {executionMode === "ON_SITE" ? "Sur place" : "Chez un prestataire"}
                            </span>
                            {!isCompleted ? (
                              <Button className="h-7 px-1.5 text-xs text-gray-600" size="sm" type="button" variant="ghost" onClick={() => editExecutionMode(item.id)}>
                                <Pencil className="h-3.5 w-3.5" />
                                Modifier
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : <div />}

                    <div className="mt-3 min-w-0 lg:mt-0">
                      {showsOnSiteStatus || showsPartOrderStatus ? (
                        <>
                          <p className="mb-1 text-[11px] font-medium leading-4 text-gray-500">État</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {showsOnSiteStatus ? (
                              <>
                                <span
                                  className={[
                                    "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
                                    item.executionCompletedAt
                                      ? "bg-emerald-50 text-emerald-800"
                                      : "bg-amber-50 text-amber-900",
                                  ].join(" ")}
                                >
                                  {item.executionCompletedAt ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                  {item.executionCompletedAt ? "Réparation terminée" : "À réparer sur place"}
                                </span>
                                {!isCompleted ? (
                                  <Button
                                    className="h-8 px-2.5 text-xs"
                                    disabled={executionSavingId === item.id || isSelectionChanged}
                                    size="sm"
                                    type="button"
                                    variant={item.executionCompletedAt ? "outline" : "default"}
                                    onClick={() => void updateExecutionStatus(item)}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {executionSavingId === item.id
                                      ? "Mise à jour..."
                                      : item.executionCompletedAt
                                        ? "Remettre à faire"
                                        : "Marquer terminée"}
                                  </Button>
                                ) : null}
                              </>
                            ) : null}
                            {showsPartOrderStatus ? (
                              <>
                                <span
                                  className={[
                                    "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
                                    item.partOrderStatus === "ORDERED" ? "bg-emerald-50 text-emerald-800" : "bg-orange-50 text-orange-700",
                                  ].join(" ")}
                                >
                                  {item.partOrderStatus === "ORDERED" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                                  {item.partOrderStatus === "ORDERED" ? "Pièce commandée" : "Pièce à commander"}
                                </span>
                                {!isCompleted ? (
                                  <Button
                                    className="h-8 px-2.5 text-xs"
                                    disabled={partOrderSavingId === item.id}
                                    size="sm"
                                    type="button"
                                    variant={item.partOrderStatus === "ORDERED" ? "outline" : "default"}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      void updatePartOrder(item, item.partOrderStatus === "ORDERED" ? "TO_ORDER" : "ORDERED");
                                    }}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {partOrderSavingId === item.id ? "Mise à jour..." : item.partOrderStatus === "ORDERED" ? "Remettre à commander" : "Marquer commandée"}
                                  </Button>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                          {showsOnSiteStatus && isSelectionChanged ? (
                            <p className="mt-1.5 text-xs text-amber-700">Enregistre la sélection avant de mettre à jour la réparation.</p>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
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

        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
            <p className="text-sm leading-5 text-gray-600">
              {isClosedWithoutDamage
                ? "Le véhicule reste en station et le dossier est terminé."
                : isCompleted
                  ? "Le véhicule a été récupéré. Le dossier ne peut plus être modifié."
                  : items.length
                    ? "Les réparations décochées restent enregistrées. Le prestataire ne recevra que les réparations qui lui sont attribuées."
                    : "Aucune demande prestataire ni récupération ne sera créée."}
            </p>
          </div>
          {!isClosedWithoutDamage && !isCompleted && (isSummaryPending || isSelectionChanged) ? (
            <Button className="w-full sm:w-auto" disabled={isSaving || selectedForbiddenCount > 0 || selectedWithoutExecutionModeCount > 0} size="sm" type="button" onClick={saveSelection}>
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

export function VehicleCheckTimingSummary({ vehicleCheck }: { vehicleCheck: VehicleCheck }) {
  const controlCompletedAt = vehicleCheck.fieldCompletedAt;
  if (!controlCompletedAt) return null;

  const summaryFinalizedAt = vehicleCheck.summaryFinalizedAt;
  const completedAt = vehicleCheck.completedAt;
  const now = new Date();
  const selectedItems = (vehicleCheck.items ?? []).filter(
    (item) => item.selectedForSummary && item.operationalStatus === "ACTIVE",
  );
  const onSiteItems = selectedItems.filter((item) => item.executionMode === "ON_SITE");
  const completedOnSiteItems = onSiteItems.filter((item) => item.executionCompletedAt);
  const latestOnSiteCompletion = latestDate(
    completedOnSiteItems.map((item) => item.executionCompletedAt),
  );
  const externalItems = selectedItems.filter(
    (item) => item.executionMode === "EXTERNAL_PROVIDER",
  );
  const providerDepositAt = vehicleCheck.publicShare?.takenInChargeAt;
  const providerRecoveredAt = vehicleCheck.publicShare?.vehicleRecoveredAt;
  const totalDurationEnd = completedAt ?? now;
  const latestInterventionAt = latestDate([
    latestOnSiteCompletion,
    providerRecoveredAt,
  ]);
  const timingCardCount =
    3 + (onSiteItems.length ? 1 : 0) + (externalItems.length ? 1 : 0);
  const timingGridClass =
    timingCardCount === 5
      ? "xl:grid-cols-5"
      : timingCardCount === 4
        ? "xl:grid-cols-4"
        : "xl:grid-cols-3";
  const summaryDuration = summaryFinalizedAt
    ? formatElapsedDuration(controlCompletedAt, summaryFinalizedAt)
    : null;
  const totalDuration = formatElapsedDuration(controlCompletedAt, totalDurationEnd);

  return (
    <details className="group border-t border-gray-200 bg-white">
      <summary className="flex cursor-pointer list-none flex-col gap-2 px-5 py-3 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-teal-700 shadow-sm ring-1 ring-gray-200">
            <Clock className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-950">Délais du dossier</p>
            <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
              <span>
                Contrôle → Synthèse :{" "}
                <strong className="font-semibold text-gray-800">
                  {summaryDuration ?? "En attente"}
                </strong>
              </span>
              <span>
                {completedAt ? "Durée totale" : "Dossier ouvert"} :{" "}
                <strong className="font-semibold text-gray-800">{totalDuration}</strong>
              </span>
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-2 self-end rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm transition group-hover:border-gray-400 sm:self-auto">
          <span className="group-open:hidden">Voir les délais</span>
          <span className="hidden group-open:inline">Masquer</span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
        </span>
      </summary>

      <div className="border-t border-gray-200 bg-gray-50/70 px-4 py-3">
        <div className={`grid gap-2 sm:grid-cols-2 ${timingGridClass}`}>
          <TimingCard
            date={controlCompletedAt}
            detail="Point de départ du suivi"
            label="Contrôle terminé"
            tone="success"
          />
          <TimingCard
            date={summaryFinalizedAt}
            detail={
              summaryFinalizedAt
                ? `${formatElapsedDuration(controlCompletedAt, summaryFinalizedAt)} après le contrôle`
                : `En attente depuis ${formatElapsedDuration(controlCompletedAt, now)}`
            }
            label="Synthèse"
            tone={summaryFinalizedAt ? "success" : "pending"}
          />

          {onSiteItems.length ? (
            <TimingCard
              date={latestOnSiteCompletion}
              detail={
                latestOnSiteCompletion && summaryFinalizedAt
                  ? `${formatElapsedDuration(summaryFinalizedAt, latestOnSiteCompletion)} après la synthèse`
                  : summaryFinalizedAt
                    ? `En cours depuis ${formatElapsedDuration(summaryFinalizedAt, now)}`
                    : "En attente de la synthèse"
              }
              label="Interventions sur place"
              status={`${completedOnSiteItems.length}/${onSiteItems.length} terminée${onSiteItems.length > 1 ? "s" : ""}`}
              tone={
                completedOnSiteItems.length === onSiteItems.length ? "success" : "pending"
              }
            />
          ) : null}

          {externalItems.length ? (
            <ProviderTimingCard
              depositAt={providerDepositAt}
              recoveredAt={providerRecoveredAt}
              repairCount={externalItems.length}
              summaryFinalizedAt={summaryFinalizedAt}
            />
          ) : null}

          <TimingCard
            date={completedAt}
            detail={
              completedAt
                ? [
                    `${formatElapsedDuration(controlCompletedAt, completedAt)} depuis le contrôle`,
                    latestInterventionAt
                      ? `${formatElapsedDuration(latestInterventionAt, completedAt)} après la dernière intervention`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : `Dossier ouvert depuis ${formatElapsedDuration(controlCompletedAt, now)}`
            }
            label="Dossier terminé"
            tone={completedAt ? "success" : "pending"}
          />
        </div>
      </div>
    </details>
  );
}

function ProviderTimingCard({
  depositAt,
  recoveredAt,
  repairCount,
  summaryFinalizedAt,
}: {
  depositAt?: string | null;
  recoveredAt?: string | null;
  repairCount: number;
  summaryFinalizedAt?: string | null;
}) {
  return (
    <div
      className={[
        "rounded-lg border bg-white p-3",
        recoveredAt
          ? "border-emerald-200"
          : depositAt
            ? "border-blue-200"
            : "border-amber-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-950">Chez le prestataire</p>
        <span
          className={[
            "mt-0.5 h-2 w-2 shrink-0 rounded-full",
            recoveredAt ? "bg-emerald-500" : depositAt ? "bg-blue-500" : "bg-amber-400",
          ].join(" ")}
        />
      </div>
      <p className="mt-1 text-[11px] font-medium text-gray-500">
        {repairCount} réparation{repairCount > 1 ? "s" : ""}
      </p>
      {depositAt ? (
        <div className="mt-2 space-y-1.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <span className="text-gray-500">Déposé</span>
            <span className="text-right font-medium text-gray-800">
              {formatTimingDate(depositAt)}
            </span>
          </div>
          {summaryFinalizedAt ? (
            <p className="text-[11px] text-gray-500">
              {formatElapsedDuration(summaryFinalizedAt, depositAt)} après la synthèse
            </p>
          ) : null}
          <div className="flex items-start justify-between gap-2 border-t border-gray-100 pt-1.5">
            <span className="text-gray-500">{recoveredAt ? "Récupéré" : "Chez le prestataire"}</span>
            <span className="text-right font-medium text-gray-800">
              {recoveredAt ? formatTimingDate(recoveredAt) : "En cours"}
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            {recoveredAt
              ? `${formatElapsedDuration(depositAt, recoveredAt)} chez le prestataire`
              : `Depuis ${formatElapsedDuration(depositAt, new Date())}`}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-amber-800">
          {summaryFinalizedAt
            ? `Dépôt à confirmer depuis ${formatElapsedDuration(summaryFinalizedAt, new Date())}`
            : "En attente de la synthèse"}
        </p>
      )}
    </div>
  );
}

function TimingCard({
  date,
  detail,
  label,
  status,
  tone,
}: {
  date?: string | null;
  detail: string;
  label: string;
  status?: string;
  tone: "pending" | "success";
}) {
  return (
    <div
      className={[
        "rounded-lg border bg-white p-3",
        tone === "success" ? "border-emerald-200" : "border-amber-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-950">{label}</p>
        <span
          className={[
            "mt-0.5 h-2 w-2 shrink-0 rounded-full",
            tone === "success" ? "bg-emerald-500" : "bg-amber-400",
          ].join(" ")}
        />
      </div>
      <p className="mt-2 text-sm font-semibold text-gray-900">
        {date ? formatTimingDate(date) : status ?? "En attente"}
      </p>
      {status && date ? <p className="mt-0.5 text-xs text-gray-600">{status}</p> : null}
      <p className="mt-1 text-[11px] leading-4 text-gray-500">{detail}</p>
    </div>
  );
}

function latestDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);

  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function formatTimingDate(value: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatElapsedDuration(start: string | Date, end: string | Date) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60_000),
  );

  if (elapsedMinutes < 1) return "moins d’une minute";

  const days = Math.floor(elapsedMinutes / 1_440);
  const hours = Math.floor((elapsedMinutes % 1_440) / 60);
  const minutes = elapsedMinutes % 60;
  const parts: string[] = [];

  if (days) parts.push(`${days} j`);
  if (hours) parts.push(`${hours} h`);
  if (minutes && parts.length < 2) parts.push(`${minutes} min`);

  return parts.slice(0, 2).join(" ");
}
