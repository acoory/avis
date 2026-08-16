"use client";

import {
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Images,
  ImagePlus,
  Info as InfoIcon,
  LoaderCircle,
  Lock,
  MessageSquareText,
  Paperclip,
  Send,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ManagerMultiSelect } from "@/components/business/manager-multi-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cloudinaryAssetUrl,
  cloudinaryPreviewUrl,
  cloudinaryThumbnailUrl,
  optimizeDamagePhoto,
} from "@/lib/damage-photo";
import { formatLicensePlate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { riskService } from "@/services/risk.service";
import { useAuthStore } from "@/stores/auth.store";
import { ConversationAttachment } from "@/types/conversations";
import {
  RiskAssignee,
  RiskPhoto,
  RiskPhotoCategory,
  RiskVehicle,
} from "@/types/risk";

type PhotoSlot = {
  category: RiskPhotoCategory;
  description: string;
  label: string;
  required: boolean;
  sortOrder: number;
};

type GalleryPhoto = {
  label: string;
  photo: RiskPhoto;
  section: string;
};

type GallerySection = {
  items: GalleryPhoto[];
  title: string;
};

const photoStepLabels = [
  { compact: "Ext.", label: "Extérieur" },
  { compact: "Int.", label: "Intérieur" },
  { compact: "Pneus", label: "Pneus" },
  { compact: "Dégâts", label: "Dommages" },
  { compact: "Résumé", label: "Vérification" },
] as const;

const photoSections: Array<{ title: string; slots: PhotoSlot[] }> = [
  {
    title: "Exterieur",
    slots: [
      slot(
        "EXTERIOR_FRONT_THREE_QUARTER",
        "Vue 3/4 avant",
        "Vehicule entier, recul suffisant et plaque lisible.",
        true,
        10,
      ),
      slot(
        "EXTERIOR_REAR_THREE_QUARTER",
        "Vue 3/4 arriere",
        "Vehicule entier et environnement degage.",
        true,
        20,
      ),
    ],
  },
  {
    title: "Interieur",
    slots: [
      slot(
        "DASHBOARD",
        "Compteur allume",
        "Voyants et message de revision visibles.",
        true,
        30,
      ),
      slot(
        "INTERIOR_FRONT",
        "Interieur avant",
        "Vue globale des sieges et du poste de conduite.",
        true,
        40,
      ),
      slot(
        "INTERIOR_REAR",
        "Interieur arriere",
        "Vue globale de la banquette et des garnitures.",
        true,
        50,
      ),
      slot(
        "TRUNK",
        "Coffre",
        "Coffre et equipements presents (facultatif).",
        false,
        60,
      ),
    ],
  },
  {
    title: "Pneus",
    slots: [
      slot(
        "WHEEL_FRONT_LEFT",
        "Pneu avant gauche",
        "Vue globale de la roue et du pneumatique.",
        true,
        70,
      ),
      slot(
        "WHEEL_FRONT_RIGHT",
        "Pneu avant droit",
        "Vue globale de la roue et du pneumatique.",
        true,
        80,
      ),
      slot(
        "WHEEL_REAR_LEFT",
        "Pneu arrière gauche",
        "Vue globale de la roue et du pneumatique.",
        true,
        90,
      ),
      slot(
        "WHEEL_REAR_RIGHT",
        "Pneu arrière droit",
        "Vue globale de la roue et du pneumatique.",
        true,
        100,
      ),
    ],
  },
];

const tires: Array<{
  globalCategory: RiskPhotoCategory;
  id: "front-left" | "front-right" | "rear-left" | "rear-right";
  label: string;
  shortLabel: string;
  sortOrder: number;
}> = [
  {
    globalCategory: "WHEEL_FRONT_LEFT",
    id: "front-left",
    label: "Pneu avant gauche",
    shortLabel: "AV G",
    sortOrder: 70,
  },
  {
    globalCategory: "WHEEL_FRONT_RIGHT",
    id: "front-right",
    label: "Pneu avant droit",
    shortLabel: "AV D",
    sortOrder: 80,
  },
  {
    globalCategory: "WHEEL_REAR_LEFT",
    id: "rear-left",
    label: "Pneu arrière gauche",
    shortLabel: "AR G",
    sortOrder: 90,
  },
  {
    globalCategory: "WHEEL_REAR_RIGHT",
    id: "rear-right",
    label: "Pneu arrière droit",
    shortLabel: "AR D",
    sortOrder: 100,
  },
];

const requiredCategories = photoSections
  .flatMap((section) => section.slots)
  .filter((item) => item.required)
  .map((item) => item.category);

export function RiskVehicleWorkspace({
  initialVehicle,
}: {
  initialVehicle: RiskVehicle;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [uploadingSlots, setUploadingSlots] = useState<Set<string>>(new Set());
  const [damageGroupIds, setDamageGroupIds] = useState<string[]>(() =>
    damageGroups(initialVehicle.photos),
  );
  const [expandedDamageGroupId, setExpandedDamageGroupId] = useState<
    string | null
  >(() => firstIncompleteDamageGroup(initialVehicle.photos));
  const [photoStepIndex, setPhotoStepIndex] = useState(() =>
    initialPhotoStep(initialVehicle.photos),
  );
  const [tireIndex, setTireIndex] = useState(() =>
    initialTireIndex(initialVehicle.photos),
  );
  const [showVehicleInfo, setShowVehicleInfo] = useState(false);
  const [isPlateCopied, setIsPlateCopied] = useState(false);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isCreator = vehicle.creatorId === user?.id;
  const canEditPhotos = isCreator && vehicle.status === "DRAFT";
  const isPhotoJourney = canEditPhotos;
  const isPrimary = vehicle.assignments.some(
    (assignment) =>
      assignment.userId === user?.id && assignment.role === "PRIMARY",
  );
  const uploadedCategories = new Set(
    vehicle.photos.map((photo) => photo.category),
  );
  const missingRequired = requiredCategories.filter(
    (category) => !uploadedCategories.has(category),
  );
  const incompleteDamageCount = damageGroupIds.filter((groupId) => {
    const group = vehicle.photos.filter(
      (photo) => photo.damageGroupId === groupId,
    );
    return (
      !group.some((photo) => photo.category === "DAMAGE_WIDE") ||
      !group.some((photo) => photo.category === "DAMAGE_CLOSE_UP")
    );
  }).length;
  const canSubmit =
    vehicle.status === "DRAFT" &&
    isCreator &&
    !missingRequired.length &&
    !incompleteDamageCount &&
    uploadingSlots.size === 0;
  const currentSection = photoSections[photoStepIndex];
  const currentSectionMissing = currentSection
    ? currentSection.slots.filter(
        (photoSlot) =>
          photoSlot.required && !uploadedCategories.has(photoSlot.category),
      )
    : [];
  const currentPhotoStepComplete =
    photoStepIndex < photoSections.length
      ? currentSectionMissing.length === 0
      : photoStepIndex === 3
        ? incompleteDamageCount === 0
        : canSubmit;
  const currentTireComplete = vehicle.photos.some(
    (photo) => photo.slotKey === tires[tireIndex].globalCategory,
  );
  const firstIncompleteTireIndex = tires.findIndex(
    (tire) =>
      !vehicle.photos.some((photo) => photo.slotKey === tire.globalCategory),
  );
  const gallerySections = useMemo(
    () => buildGallerySections(vehicle.photos),
    [vehicle.photos],
  );
  const galleryPhotos = useMemo(
    () => gallerySections.flatMap((section) => section.items),
    [gallerySections],
  );

  async function reload() {
    const next = await riskService.findOne(vehicle.id);
    setVehicle(next);
    setDamageGroupIds((current) => [
      ...new Set([...current, ...damageGroups(next.photos)]),
    ]);
  }

  async function uploadPhoto(
    file: File,
    photoSlot: PhotoSlot,
    damageGroupId?: string,
    customSlotKey?: string,
  ) {
    const slotKey =
      customSlotKey ??
      (damageGroupId
        ? `${damageGroupId}:${photoSlot.category}`
        : photoSlot.category);
    const completesDamageGroup = Boolean(
      damageGroupId &&
      ((photoSlot.category === "DAMAGE_WIDE" &&
        vehicle.photos.some(
          (photo) =>
            photo.damageGroupId === damageGroupId &&
            photo.category === "DAMAGE_CLOSE_UP",
        )) ||
        (photoSlot.category === "DAMAGE_CLOSE_UP" &&
          vehicle.photos.some(
            (photo) =>
              photo.damageGroupId === damageGroupId &&
              photo.category === "DAMAGE_WIDE",
          ))),
    );
    setUploadingSlots((current) => new Set(current).add(slotKey));
    try {
      const optimized = await optimizeDamagePhoto(file, {
        maximumDimension: 2048,
        quality: 0.82,
      });
      await riskService.uploadPhoto(vehicle.id, optimized, {
        category: photoSlot.category,
        damageGroupId,
        slotKey,
        sortOrder: photoSlot.sortOrder,
      });
      await reload();
      if (completesDamageGroup) setExpandedDamageGroupId(null);
      toast.success("Photo enregistree.");
    } catch {
      toast.error("Impossible d'envoyer cette photo.");
    } finally {
      setUploadingSlots((current) => {
        const next = new Set(current);
        next.delete(slotKey);
        return next;
      });
    }
  }

  async function removePhoto(photo: RiskPhoto) {
    try {
      await riskService.removePhoto(vehicle.id, photo.id);
      setVehicle((current) => ({
        ...current,
        photos: current.photos.filter((item) => item.id !== photo.id),
      }));
    } catch {
      toast.error("Impossible de supprimer cette photo.");
    }
  }

  function addDamageGroup() {
    const groupId = createCompatibleUuid();
    setDamageGroupIds((current) => [...current, groupId]);
    setExpandedDamageGroupId(groupId);
    window.setTimeout(() => {
      document
        .getElementById(`risk-damage-${groupId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function goToPhotoStep(index: number) {
    setPhotoStepIndex(Math.max(0, Math.min(photoStepLabels.length - 1, index)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBackInPhotoJourney() {
    if (photoStepIndex === 2 && tireIndex > 0) {
      setTireIndex((index) => index - 1);
      return;
    }
    goToPhotoStep(photoStepIndex - 1);
  }

  function advanceTireJourney() {
    if (!currentTireComplete) return;
    if (tireIndex < tires.length - 1) {
      setTireIndex((index) => index + 1);
      return;
    }
    if (firstIncompleteTireIndex !== -1) {
      setTireIndex(firstIncompleteTireIndex);
      return;
    }
    goToPhotoStep(3);
  }

  async function removeDamageGroup(groupId: string) {
    const photos = vehicle.photos.filter(
      (photo) => photo.damageGroupId === groupId,
    );
    await Promise.all(
      photos.map((photo) => riskService.removePhoto(vehicle.id, photo.id)),
    );
    setVehicle((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.damageGroupId !== groupId),
    }));
    setDamageGroupIds((current) => current.filter((id) => id !== groupId));
    setExpandedDamageGroupId((current) =>
      current === groupId ? null : current,
    );
  }

  async function submitDossier() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const updated = await riskService.submit(vehicle.id);
      setVehicle(updated);
      toast.success(
        "Dossier transmis. Les personnes assignees ont ete prevenues.",
      );
    } catch {
      toast.error("Impossible de transmettre le dossier.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function closeDossier() {
    if (!window.confirm("Clore ce dossier Risk ? Il passera en lecture seule."))
      return;
    setIsClosing(true);
    try {
      const updated = await riskService.close(vehicle.id);
      setVehicle(updated);
      toast.success("Dossier clos.");
    } catch {
      toast.error("Impossible de clore le dossier.");
    } finally {
      setIsClosing(false);
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard/risk");
  }

  async function copyPlate() {
    await navigator.clipboard.writeText(vehicle.licensePlate);
    setIsPlateCopied(true);
    window.setTimeout(() => setIsPlateCopied(false), 1500);
  }

  const statusLabel =
    vehicle.status === "DRAFT"
      ? "Brouillon"
      : vehicle.status === "CLOSED"
        ? "Clos"
        : isCreator
          ? "Transmis"
          : "À analyser";
  const plate = formatLicensePlate(
    vehicle.licensePlate,
    vehicle.licensePlateCountry,
    vehicle.licensePlateRaw,
  );

  return (
    <div className={cn("space-y-4", isPhotoJourney && "pb-20 md:pb-0")}>
      <div className="sticky top-14 z-20 -mx-4 -mt-4 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur md:top-16 md:-mx-6 md:-mt-6">
        <div className="flex h-16 min-w-0 items-center gap-2 px-4 md:gap-3 md:px-6">
          <Button
            aria-label="Retour à la liste Risk"
            className="h-9 w-9 shrink-0"
            size="icon"
            title="Retour à la liste Risk"
            type="button"
            variant="outline"
            onClick={goBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-base font-semibold text-gray-950">
                {plate}
              </p>
              <button
                aria-label={`Copier l'immatriculation ${plate}`}
                className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-teal-700 sm:inline-flex"
                title={
                  isPlateCopied
                    ? "Immatriculation copiée"
                    : "Copier l'immatriculation"
                }
                type="button"
                onClick={() => void copyPlate()}
              >
                {isPlateCopied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <span className="hidden shrink-0 text-xs font-medium text-gray-400 lg:inline">
                {vehicle.riskNumber}
              </span>
            </div>
            <p className="truncate text-[10px] leading-3 text-gray-500 sm:text-xs sm:leading-4">
              {vehicle.manufacturer.name} · Risk Showroom
            </p>
          </div>

          <div className="hidden shrink-0 md:block">
            <RiskStatusProgress label={statusLabel} status={vehicle.status} />
          </div>
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold md:hidden",
              statusTone(vehicle.status),
            )}
          >
            {statusLabel}
          </span>

          {vehicle.status === "SUBMITTED" &&
          (isPrimary || user?.role === "ADMIN") ? (
            <Button
              aria-label="Clore le dossier"
              className="h-9 shrink-0 px-2 sm:px-3"
              disabled={isClosing}
              size="sm"
              title="Clore le dossier"
              type="button"
              onClick={() => void closeDossier()}
            >
              {isClosing ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Clore</span>
            </Button>
          ) : null}

          <Button
            aria-expanded={showVehicleInfo}
            aria-label="Informations du dossier"
            className="h-9 shrink-0 gap-1 px-2"
            size="sm"
            title="Informations du dossier"
            type="button"
            variant="outline"
            onClick={() => setShowVehicleInfo((visible) => !visible)}
          >
            <InfoIcon className="h-4 w-4" />
            <span className="hidden text-xs font-semibold lg:inline">
              Informations
            </span>
            <ChevronDown
              className={cn(
                "hidden h-3.5 w-3.5 transition-transform lg:block",
                showVehicleInfo && "rotate-180",
              )}
            />
          </Button>
        </div>

        {showVehicleInfo ? (
          <div className="max-h-[calc(100dvh-7.5rem)] overflow-y-auto border-t border-gray-200 bg-gray-50 px-3 py-2 md:px-5">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
              <CompactInformation label="Dossier" value={vehicle.riskNumber} />
              <CompactInformation label="Agence" value={vehicle.agency.name} />
              <CompactInformation label="Ville" value={vehicle.agency.city} />
              <CompactInformation
                label="Responsable"
                value={primaryName(vehicle)}
              />
              <CompactInformation
                label="Créé par"
                value={`${vehicle.creator.firstName} ${vehicle.creator.lastName}`.trim()}
              />
              <CompactInformation
                accent
                label="Photos"
                value={`${vehicle.photos.length} photo${vehicle.photos.length > 1 ? "s" : ""}`}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-2">
              <UsersRound className="mr-1 h-3.5 w-3.5 text-gray-400" />
              {vehicle.assignments.map((assignment) => (
                <span
                  className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700"
                  key={assignment.id}
                >
                  {assignment.user.firstName} {assignment.user.lastName}
                  {assignment.role === "PRIMARY" ? " · Responsable" : ""}
                </span>
              ))}
            </div>
            {isCreator && vehicle.status === "DRAFT" ? (
              <div className="mt-2 rounded-md border border-gray-200 bg-white p-3">
                <RiskAssignmentEditor vehicle={vehicle} onChange={setVehicle} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className={cn("space-y-5 pt-1", isPhotoJourney && "mx-auto max-w-4xl")}
      >
        {isPhotoJourney ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Parcours photographique
                </p>
                <p className="text-xs text-slate-500">
                  Étape {photoStepIndex + 1} sur {photoStepLabels.length}
                </p>
              </div>
              <span className="text-xs font-semibold text-teal-800">
                {Math.round(
                  (photoSections
                    .flatMap((section) => section.slots)
                    .filter(
                      (photoSlot) =>
                        photoSlot.required &&
                        uploadedCategories.has(photoSlot.category),
                    ).length /
                    requiredCategories.length) *
                    100,
                )}
                % des photos requises
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-teal-700 transition-all"
                style={{
                  width: `${
                    (photoSections
                      .flatMap((section) => section.slots)
                      .filter(
                        (photoSlot) =>
                          photoSlot.required &&
                          uploadedCategories.has(photoSlot.category),
                      ).length /
                      requiredCategories.length) *
                    100
                  }%`,
                }}
              />
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {photoStepLabels.map((step, index) => {
                const complete = isJourneyStepComplete(
                  index,
                  vehicle.photos,
                  incompleteDamageCount,
                  canSubmit,
                );
                return (
                  <button
                    aria-current={photoStepIndex === index ? "step" : undefined}
                    className={cn(
                      "min-w-0 rounded-lg border px-1 py-2 text-center transition",
                      photoStepIndex === index
                        ? "border-teal-700 bg-teal-50 text-teal-900"
                        : "border-slate-200 bg-white text-slate-500",
                    )}
                    key={step.label}
                    type="button"
                    onClick={() => goToPhotoStep(index)}
                  >
                    <span
                      className={cn(
                        "mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                        complete
                          ? "bg-emerald-600 text-white"
                          : photoStepIndex === index
                            ? "bg-teal-700 text-white"
                            : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="mt-1 block truncate text-[10px] font-semibold sm:hidden">
                      {step.compact}
                    </span>
                    <span className="mt-1 hidden truncate text-xs font-semibold sm:block">
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {!isPhotoJourney ? (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,.75fr)]">
            <RiskPhotoGallery
              sections={gallerySections}
              onOpen={(photoId) =>
                setViewerPhotoIndex(
                  galleryPhotos.findIndex((item) => item.photo.id === photoId),
                )
              }
            />
            <div className="xl:sticky xl:top-20">
              <RiskConversationPanel vehicle={vehicle} onChange={setVehicle} />
            </div>
          </div>
        ) : null}

        {photoSections.map((section, sectionIndex) =>
          sectionIndex !== 2 &&
          isPhotoJourney &&
          photoStepIndex === sectionIndex ? (
            <Card key={section.title}>
              <CardHeader className="p-3 pb-2.5 sm:p-6 sm:pb-4">
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{section.title}</span>
                  {isPhotoJourney && !currentSectionMissing.length ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                      <Check className="h-3 w-3" /> Étape complète
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 p-3 pt-0 sm:grid-cols-2 sm:gap-3 sm:p-6 sm:pt-0">
                {section.slots.map((photoSlot) => (
                  <PhotoCard
                    canEdit={canEditPhotos}
                    isUploading={uploadingSlots.has(photoSlot.category)}
                    key={photoSlot.category}
                    photo={vehicle.photos.find(
                      (photo) => photo.slotKey === photoSlot.category,
                    )}
                    slot={photoSlot}
                    onRemove={removePhoto}
                    onUpload={(file) => uploadPhoto(file, photoSlot)}
                  />
                ))}
              </CardContent>
            </Card>
          ) : null,
        )}

        {isPhotoJourney && photoStepIndex === 2 ? (
          <TiresCard
            canEdit={canEditPhotos}
            currentIndex={tireIndex}
            photos={vehicle.photos}
            uploadingSlots={uploadingSlots}
            onIndexChange={setTireIndex}
            onRemove={removePhoto}
            onUpload={(file, photoSlot, slotKey) =>
              uploadPhoto(file, photoSlot, undefined, slotKey)
            }
          />
        ) : null}

        {isPhotoJourney && photoStepIndex === 3 ? (
          <Card>
            <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
              <CardTitle>Photos des dommages</CardTitle>
              <p className="text-sm text-slate-500">
                Une vue générale et une vue rapprochée par dommage.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
              {damageGroupIds.length ? (
                damageGroupIds.map((groupId, index) => {
                  const groupPhotos = vehicle.photos.filter(
                    (photo) => photo.damageGroupId === groupId,
                  );
                  const complete =
                    groupPhotos.some(
                      (photo) => photo.category === "DAMAGE_WIDE",
                    ) &&
                    groupPhotos.some(
                      (photo) => photo.category === "DAMAGE_CLOSE_UP",
                    );
                  const expanded = expandedDamageGroupId === groupId;

                  if (!expanded) {
                    return (
                      <div
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5"
                        id={`risk-damage-${groupId}`}
                        key={groupId}
                      >
                        <DamagePhotoCarousel
                          label={`Dommage ${index + 1}`}
                          photos={[
                            groupPhotos.find(
                              (photo) => photo.category === "DAMAGE_WIDE",
                            ),
                            groupPhotos.find(
                              (photo) => photo.category === "DAMAGE_CLOSE_UP",
                            ),
                          ].filter((photo): photo is RiskPhoto =>
                            Boolean(photo),
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            Dommage {index + 1}
                          </p>
                          <p
                            className={cn(
                              "text-xs font-medium",
                              complete ? "text-emerald-700" : "text-amber-700",
                            )}
                          >
                            {complete ? "Terminé" : "À compléter"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          variant="ghost"
                          onClick={() => setExpandedDamageGroupId(groupId)}
                        >
                          {canEditPhotos ? "Modifier" : "Voir"}
                        </Button>
                        {canEditPhotos ? (
                          <Button
                            aria-label="Supprimer ce dommage"
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() => void removeDamageGroup(groupId)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        ) : null}
                      </div>
                    );
                  }

                  return (
                    <div
                      className="scroll-mt-20 rounded-lg border border-teal-200 bg-teal-50/30 p-3"
                      id={`risk-damage-${groupId}`}
                      key={groupId}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Dommage {index + 1}
                          </p>
                          <p className="text-xs text-slate-500">
                            Ajoutez les deux vues demandées.
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            type="button"
                            variant="ghost"
                            onClick={() => setExpandedDamageGroupId(null)}
                          >
                            Réduire
                          </Button>
                          {canEditPhotos ? (
                            <Button
                              aria-label="Supprimer ce dommage"
                              size="icon"
                              type="button"
                              variant="ghost"
                              onClick={() => void removeDamageGroup(groupId)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          slot(
                            "DAMAGE_WIDE",
                            "Vue générale",
                            "Plan large pour situer le dommage.",
                            true,
                            200 + index * 2,
                          ),
                          slot(
                            "DAMAGE_CLOSE_UP",
                            "Vue rapprochée",
                            "Gros plan net du dommage.",
                            true,
                            201 + index * 2,
                          ),
                        ].map((photoSlot) => {
                          const slotKey = `${groupId}:${photoSlot.category}`;
                          return (
                            <PhotoCard
                              canEdit={canEditPhotos}
                              isUploading={uploadingSlots.has(slotKey)}
                              key={photoSlot.category}
                              photo={vehicle.photos.find(
                                (photo) => photo.slotKey === slotKey,
                              )}
                              slot={photoSlot}
                              onRemove={removePhoto}
                              onUpload={(file) =>
                                uploadPhoto(file, photoSlot, groupId)
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                  Aucun dommage ajouté.
                </p>
              )}
              {canEditPhotos ? (
                <Button
                  className="w-full"
                  type="button"
                  variant="outline"
                  onClick={addDamageGroup}
                >
                  <ImagePlus className="h-4 w-4" />
                  {damageGroupIds.length
                    ? "Ajouter un autre dommage"
                    : "Ajouter un dommage"}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {vehicle.status === "DRAFT" &&
        isCreator &&
        (!isPhotoJourney || photoStepIndex === 4) ? (
          <Card className={canSubmit ? "border-teal-200 bg-teal-50/40" : ""}>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-base font-semibold text-slate-950">
                  Vérification avant transmission
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {missingRequired.length
                    ? `${missingRequired.length} photo${missingRequired.length > 1 ? "s" : ""} obligatoire${missingRequired.length > 1 ? "s" : ""} manquante${missingRequired.length > 1 ? "s" : ""}.`
                    : incompleteDamageCount
                      ? "Complete la vue large et rapprochee de chaque dommage."
                      : "Le dossier est complet et peut être transmis."}
                </p>
              </div>
              {isPhotoJourney ? (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                  {photoSections.map((section, index) => {
                    const requiredSlots = section.slots.filter(
                      (photoSlot) => photoSlot.required,
                    );
                    const completed = requiredSlots.filter((photoSlot) =>
                      uploadedCategories.has(photoSlot.category),
                    ).length;
                    const tireDamageCount = vehicle.photos.filter(
                      (photo) => photo.category === "TIRE_DAMAGE",
                    ).length;
                    return (
                      <button
                        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm hover:bg-slate-50"
                        key={section.title}
                        type="button"
                        onClick={() => goToPhotoStep(index)}
                      >
                        <span className="font-medium text-slate-800">
                          {section.title}
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            completed === requiredSlots.length
                              ? "text-emerald-700"
                              : "text-amber-700",
                          )}
                        >
                          {completed}/{requiredSlots.length}
                          {index === 2 && tireDamageCount
                            ? ` · ${tireDamageCount} dommage${tireDamageCount > 1 ? "s" : ""}`
                            : ""}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm hover:bg-slate-50"
                    type="button"
                    onClick={() => goToPhotoStep(3)}
                  >
                    <span className="font-medium text-slate-800">Dommages</span>
                    <span
                      className={cn(
                        "font-semibold",
                        incompleteDamageCount
                          ? "text-amber-700"
                          : "text-emerald-700",
                      )}
                    >
                      {damageGroupIds.length
                        ? `${damageGroupIds.length} ajouté${damageGroupIds.length > 1 ? "s" : ""}`
                        : "Aucun"}
                    </span>
                  </button>
                </div>
              ) : (
                <Button
                  disabled={!canSubmit || isSubmitting}
                  type="button"
                  onClick={() => void submitDossier()}
                >
                  {isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Terminer et transmettre
                </Button>
              )}
            </CardContent>
          </Card>
        ) : null}

        {isPhotoJourney ? (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:static md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none">
            <div className="mx-auto flex max-w-4xl gap-2 [padding-bottom:max(0px,env(safe-area-inset-bottom))] md:justify-end">
              {photoStepIndex > 0 ? (
                <Button
                  className="h-12 px-3"
                  type="button"
                  variant="outline"
                  onClick={goBackInPhotoJourney}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Retour</span>
                </Button>
              ) : null}
              {photoStepIndex === 2 ? (
                <Button
                  className="h-12 min-w-0 flex-1 md:flex-none"
                  disabled={!currentTireComplete || uploadingSlots.size > 0}
                  type="button"
                  onClick={advanceTireJourney}
                >
                  {tireIndex < tires.length - 1
                    ? `Pneu suivant · ${tireIndex + 2}/${tires.length}`
                    : firstIncompleteTireIndex !== -1
                      ? `Compléter ${tires[firstIncompleteTireIndex].shortLabel}`
                      : "Continuer vers les dommages"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : photoStepIndex < photoStepLabels.length - 1 ? (
                <Button
                  className="h-12 min-w-0 flex-1 md:flex-none"
                  disabled={
                    !currentPhotoStepComplete || uploadingSlots.size > 0
                  }
                  type="button"
                  onClick={() => goToPhotoStep(photoStepIndex + 1)}
                >
                  {photoStepIndex === 3
                    ? "Vérifier le dossier"
                    : "Étape suivante"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="h-12 min-w-0 flex-1 md:flex-none"
                  disabled={!canSubmit || isSubmitting}
                  type="button"
                  onClick={() => void submitDossier()}
                >
                  {isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Terminer et transmettre
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
      {viewerPhotoIndex !== null && galleryPhotos[viewerPhotoIndex] ? (
        <RiskPhotoViewer
          currentIndex={viewerPhotoIndex}
          items={galleryPhotos}
          onClose={() => setViewerPhotoIndex(null)}
          onIndexChange={setViewerPhotoIndex}
        />
      ) : null}
    </div>
  );
}

function RiskPhotoGallery({
  onOpen,
  sections,
}: {
  onOpen: (photoId: string) => void;
  sections: GallerySection[];
}) {
  if (!sections.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-slate-500">
          Aucune photo disponible dans ce dossier.
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-none">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <Images className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-950">
              Photos du contrôle
            </h2>
            <p className="truncate text-xs text-gray-500">
              Cliquez sur une photo pour ouvrir le carrousel
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
          {sections.reduce((total, section) => total + section.items.length, 0)}
          &nbsp;photos
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {sections.map((section) => (
          <div className="px-4 py-3" key={section.title}>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                {section.title}
              </h3>
              <span className="text-[11px] font-medium text-gray-400">
                {section.items.length} photo
                {section.items.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
              {section.items.map((item) => (
                <button
                  className="group min-w-0 overflow-hidden rounded-md border border-gray-200 bg-white text-left transition hover:border-teal-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  key={item.photo.id}
                  type="button"
                  onClick={() => onOpen(item.photo.id)}
                >
                  <span className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      alt={item.label}
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                      src={cloudinaryThumbnailUrl(item.photo, 400)}
                    />
                    <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                  </span>
                  <span className="block truncate px-2 py-1.5 text-[11px] font-semibold text-gray-800">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskPhotoViewer({
  currentIndex,
  items,
  onClose,
  onIndexChange,
}: {
  currentIndex: number;
  items: GalleryPhoto[];
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const current = items[currentIndex];
  const previewUrls = useMemo(
    () => items.map((item) => cloudinaryPreviewUrl(item.photo, 1800)),
    [items],
  );
  const [preloadAttempt, setPreloadAttempt] = useState(0);
  const [preloadState, setPreloadState] = useState({
    complete: false,
    failed: 0,
    loaded: 0,
    ready: false,
    total: previewUrls.length,
  });

  useEffect(() => {
    let cancelled = false;
    let completed = 0;
    let failed = 0;

    for (const url of previewUrls) {
      const image = new Image();
      let settled = false;
      const finish = (didFail: boolean) => {
        if (cancelled || settled) return;
        settled = true;
        completed += 1;
        if (didFail) failed += 1;
        setPreloadState({
          complete: completed === previewUrls.length,
          failed,
          loaded: completed - failed,
          ready: completed === previewUrls.length && failed === 0,
          total: previewUrls.length,
        });
      };
      image.onload = () => {
        if (typeof image.decode === "function") {
          void image
            .decode()
            .then(() => finish(false))
            .catch(() => finish(false));
          return;
        }
        finish(false);
      };
      image.onerror = () => finish(true);
      image.src = url;
    }

    return () => {
      cancelled = true;
    };
  }, [preloadAttempt, previewUrls]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (preloadState.ready && event.key === "ArrowLeft") {
        onIndexChange(currentIndex === 0 ? items.length - 1 : currentIndex - 1);
      }
      if (preloadState.ready && event.key === "ArrowRight") {
        onIndexChange((currentIndex + 1) % items.length);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex, items.length, onClose, onIndexChange, preloadState.ready]);

  return (
    <div
      aria-label="Visionneuse des photos du contrôle"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex flex-col bg-slate-950/95 p-3 text-white sm:p-5"
      role="dialog"
      onClick={onClose}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">
            {preloadState.ready ? current.label : "Chargement du carrousel"}
          </p>
          <p className="text-xs text-white/60">
            {preloadState.ready
              ? `${current.section} · ${currentIndex + 1}/${items.length}`
              : `${preloadState.loaded}/${preloadState.total} photos chargées`}
          </p>
        </div>
        <button
          aria-label="Fermer la visionneuse"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          type="button"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!preloadState.ready ? (
        <div
          className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 text-center"
          onClick={(event) => event.stopPropagation()}
        >
          {!preloadState.complete ? (
            <>
              <LoaderCircle className="h-10 w-10 animate-spin text-teal-400" />
              <div>
                <p className="font-semibold">Préparation des photos…</p>
                <p className="mt-1 text-sm text-white/60">
                  Le carrousel s’ouvrira quand toutes les images seront prêtes.
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-teal-400 transition-all"
                  style={{
                    width: `${
                      ((preloadState.loaded + preloadState.failed) /
                        Math.max(1, preloadState.total)) *
                      100
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-white/50">
                {preloadState.loaded + preloadState.failed}/{preloadState.total}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">
                {preloadState.failed} photo
                {preloadState.failed > 1 ? "s n’ont" : " n’a"} pas pu être
                chargée{preloadState.failed > 1 ? "s" : ""}.
              </p>
              <p className="text-sm text-white/60">
                Vérifiez la connexion puis relancez le chargement.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPreloadState({
                    complete: false,
                    failed: 0,
                    loaded: 0,
                    ready: false,
                    total: previewUrls.length,
                  });
                  setPreloadAttempt((attempt) => attempt + 1);
                }}
              >
                Réessayer
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div
            className="relative mx-auto my-3 flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              alt={current.label}
              className="max-h-full max-w-full rounded-lg object-contain"
              src={previewUrls[currentIndex]}
            />
            {items.length > 1 ? (
              <>
                <button
                  aria-label="Photo précédente"
                  className="absolute left-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 sm:left-3"
                  type="button"
                  onClick={() =>
                    onIndexChange(
                      currentIndex === 0 ? items.length - 1 : currentIndex - 1,
                    )
                  }
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  aria-label="Photo suivante"
                  className="absolute right-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 sm:right-3"
                  type="button"
                  onClick={() =>
                    onIndexChange((currentIndex + 1) % items.length)
                  }
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}
          </div>

          <div
            className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto pb-[max(0px,env(safe-area-inset-bottom))]"
            onClick={(event) => event.stopPropagation()}
          >
            {items.map((item, index) => (
              <button
                aria-label={`Afficher ${item.label}`}
                className={cn(
                  "h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 bg-slate-900",
                  index === currentIndex
                    ? "border-teal-400"
                    : "border-transparent opacity-60 hover:opacity-100",
                )}
                key={item.photo.id}
                type="button"
                onClick={() => onIndexChange(index)}
              >
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={cloudinaryThumbnailUrl(item.photo, 200)}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DamagePhotoCarousel({
  label,
  photos,
}: {
  label: string;
  photos: RiskPhoto[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const safeIndex = photos.length
    ? Math.min(currentIndex, photos.length - 1)
    : 0;
  const currentPhoto = photos[safeIndex];

  if (!currentPhoto) {
    return (
      <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300">
        <Camera className="h-5 w-5" />
      </span>
    );
  }

  return (
    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
      <img
        alt={`${label}, photo ${safeIndex + 1}`}
        className="h-full w-full object-cover"
        src={cloudinaryThumbnailUrl(currentPhoto, 240)}
      />
      {photos.length > 1 ? (
        <>
          <button
            aria-label="Photo précédente"
            className="absolute left-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white"
            type="button"
            onClick={() =>
              setCurrentIndex((index) =>
                index === 0 ? photos.length - 1 : index - 1,
              )
            }
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Photo suivante"
            className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white"
            type="button"
            onClick={() =>
              setCurrentIndex((index) => (index + 1) % photos.length)
            }
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
            {safeIndex + 1}/{photos.length}
          </span>
        </>
      ) : null}
    </div>
  );
}

function RiskAssignmentEditor({
  onChange,
  vehicle,
}: {
  onChange: (vehicle: RiskVehicle) => void;
  vehicle: RiskVehicle;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assignees, setAssignees] = useState<RiskAssignee[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [primaryAssigneeId, setPrimaryAssigneeId] = useState("");
  const selectedAssignees = assignees.filter((assignee) =>
    assigneeIds.includes(assignee.id),
  );

  async function openEditor() {
    setIsOpen(true);
    setIsLoading(true);
    try {
      const availableAssignees = await riskService.assignees();
      const availableIds = new Set(
        availableAssignees.map((assignee) => assignee.id),
      );
      const currentIds = vehicle.assignments
        .map((assignment) => assignment.userId)
        .filter((id) => availableIds.has(id));
      const nextIds = currentIds.length
        ? currentIds
        : availableAssignees[0]
          ? [availableAssignees[0].id]
          : [];
      const currentPrimaryId = vehicle.assignments.find(
        (assignment) => assignment.role === "PRIMARY",
      )?.userId;

      setAssignees(availableAssignees);
      setAssigneeIds(nextIds);
      setPrimaryAssigneeId(
        currentPrimaryId && nextIds.includes(currentPrimaryId)
          ? currentPrimaryId
          : (nextIds[0] ?? ""),
      );
    } catch {
      setIsOpen(false);
      toast.error("Impossible de charger les responsables disponibles.");
    } finally {
      setIsLoading(false);
    }
  }

  function changeAssignees(ids: string[]) {
    setAssigneeIds(ids);
    if (!ids.includes(primaryAssigneeId)) {
      setPrimaryAssigneeId(ids[0] ?? "");
    }
  }

  async function save() {
    if (!assigneeIds.length || !primaryAssigneeId) {
      toast.error("Sélectionnez au moins un responsable.");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await riskService.updateAssignments(vehicle.id, {
        assigneeIds,
        primaryAssigneeId,
      });
      onChange(updated);
      setIsOpen(false);
      toast.success("Attribution du dossier mise à jour.");
    } catch {
      toast.error("Impossible de modifier l’attribution du dossier.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <Button
        className="w-full sm:w-auto"
        size="sm"
        type="button"
        variant="outline"
        onClick={() => void openEditor()}
      >
        <UsersRound className="h-4 w-4" /> Modifier l’attribution
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-teal-100 bg-teal-50/50 p-3">
      <div>
        <p className="text-sm font-semibold text-slate-950">
          Modifier l’attribution
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Disponible uniquement tant que le dossier est en brouillon.
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : assignees.length ? (
        <>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">
              Personnes assignées
            </label>
            <ManagerMultiSelect
              managers={assignees}
              placeholder="Choisir les personnes"
              value={assigneeIds}
              onChange={changeAssignees}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">
              Responsable principal
            </label>
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950"
              value={primaryAssigneeId}
              onChange={(event) => setPrimaryAssigneeId(event.target.value)}
            >
              {selectedAssignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.firstName} {assignee.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              disabled={isSaving}
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              Annuler
            </Button>
            <Button
              disabled={isSaving || !assigneeIds.length || !primaryAssigneeId}
              size="sm"
              type="button"
              onClick={() => void save()}
            >
              {isSaving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              Enregistrer
            </Button>
          </div>
        </>
      ) : (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Aucun manager actif n’est disponible.
        </p>
      )}
    </div>
  );
}

function TiresCard({
  canEdit,
  currentIndex,
  onIndexChange,
  onRemove,
  onUpload,
  photos,
  uploadingSlots,
}: {
  canEdit: boolean;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onRemove: (photo: RiskPhoto) => Promise<void>;
  onUpload: (
    file: File,
    photoSlot: PhotoSlot,
    slotKey: string,
  ) => Promise<void>;
  photos: RiskPhoto[];
  uploadingSlots: Set<string>;
}) {
  const tire = tires[currentIndex];
  const globalPhoto = photos.find(
    (photo) => photo.slotKey === tire.globalCategory,
  );
  const wearSlotKey = `tire:${tire.id}:wear`;
  const damageSlotPrefix = `tire:${tire.id}:damage:`;
  const wearPhoto = photos.find((photo) => photo.slotKey === wearSlotKey);
  const damagePhotos = photos.filter(
    (photo) =>
      photo.category === "TIRE_DAMAGE" &&
      photo.slotKey.startsWith(damageSlotPrefix),
  );
  const isDamageUploading = [...uploadingSlots].some((slotKey) =>
    slotKey.startsWith(damageSlotPrefix),
  );
  const globalSlot = slot(
    tire.globalCategory,
    "Vue globale obligatoire",
    "Roue et pneumatique entièrement visibles.",
    true,
    tire.sortOrder,
  );
  const wearSlot = slot(
    "TIRE_WEAR",
    "Vue de l’usure",
    "Témoin ou bande de roulement si possible (facultatif).",
    false,
    tire.sortOrder + 1,
  );
  const damageSlot = slot(
    "TIRE_DAMAGE",
    "Dommage du pneu",
    "Photo rapprochée d’un dommage visible.",
    false,
    tire.sortOrder + 2,
  );

  async function addDamagePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    for (const file of files) {
      const slotKey = `${damageSlotPrefix}${createCompatibleUuid()}`;
      await onUpload(file, damageSlot, slotKey);
    }
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Pneus</span>
          <span className="text-xs font-medium text-slate-400">
            {
              tires.filter((item) =>
                photos.some((photo) => photo.slotKey === item.globalCategory),
              ).length
            }
            /{tires.length} vues obligatoires
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-4 gap-1.5">
          {tires.map((item, index) => {
            const complete = photos.some(
              (photo) => photo.slotKey === item.globalCategory,
            );
            return (
              <button
                aria-current={currentIndex === index ? "step" : undefined}
                className={cn(
                  "rounded-lg border px-1.5 py-2 text-center text-xs font-semibold transition",
                  currentIndex === index
                    ? "border-teal-700 bg-teal-50 text-teal-900"
                    : "border-slate-200 bg-white text-slate-600",
                )}
                key={item.id}
                type="button"
                onClick={() => onIndexChange(index)}
              >
                <span
                  className={cn(
                    "mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                    complete
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {complete ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {item.shortLabel}
              </button>
            );
          })}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-950">{tire.label}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            La vue globale est obligatoire. L’usure et les dommages sont
            facultatifs.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <PhotoCard
            canEdit={canEdit}
            isUploading={uploadingSlots.has(tire.globalCategory)}
            photo={globalPhoto}
            slot={globalSlot}
            onRemove={onRemove}
            onUpload={(file) => onUpload(file, globalSlot, tire.globalCategory)}
          />
          <PhotoCard
            canEdit={canEdit}
            isUploading={uploadingSlots.has(wearSlotKey)}
            photo={wearPhoto}
            slot={wearSlot}
            onRemove={onRemove}
            onUpload={(file) => onUpload(file, wearSlot, wearSlotKey)}
          />
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Photos des dommages
              </p>
              <p className="text-xs text-slate-500">
                Facultatif · ajoutez autant de vues que nécessaire.
              </p>
            </div>
            {canEdit ? (
              <label className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                {isDamageUploading ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" />
                )}
                Ajouter
                <input
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={isDamageUploading}
                  multiple
                  type="file"
                  onChange={(event) => void addDamagePhotos(event)}
                />
              </label>
            ) : null}
          </div>

          {damagePhotos.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {damagePhotos.map((photo, index) => (
                <div
                  className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100"
                  key={photo.id}
                >
                  <img
                    alt={`Dommage ${index + 1} du ${tire.label.toLowerCase()}`}
                    className="h-full w-full object-cover"
                    src={cloudinaryThumbnailUrl(photo, 400)}
                  />
                  {canEdit ? (
                    <button
                      aria-label={`Supprimer la photo de dommage ${index + 1}`}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/65 p-1.5 text-white"
                      type="button"
                      onClick={() => void onRemove(photo)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-500">
              Aucun dommage photographié pour ce pneu.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PhotoCard({
  canEdit,
  isUploading,
  onRemove,
  onUpload,
  photo,
  slot: photoSlot,
}: {
  canEdit: boolean;
  isUploading: boolean;
  onRemove: (photo: RiskPhoto) => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  photo?: RiskPhoto;
  slot: PhotoSlot;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex min-w-0 gap-3 p-2.5 sm:block sm:p-0">
        <div className="relative h-[88px] w-[112px] shrink-0 overflow-hidden rounded-md bg-slate-100 sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-none">
          {photo ? (
            <img
              alt={photoSlot.label}
              className="h-full w-full object-cover"
              src={cloudinaryThumbnailUrl(photo, 700)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400 sm:gap-2">
              <Camera className="h-5 w-5 sm:h-8 sm:w-8" />
              <span className="text-[10px] sm:text-xs">À prendre</span>
            </div>
          )}
          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <LoaderCircle className="h-7 w-7 animate-spin text-teal-700" />
            </div>
          ) : null}
          {photo && canEdit ? (
            <button
              aria-label={`Supprimer ${photoSlot.label}`}
              className="absolute right-1.5 top-1.5 rounded-full bg-black/65 p-1.5 text-white sm:right-2 sm:top-2 sm:p-2"
              type="button"
              onClick={() => void onRemove(photo)}
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          ) : null}
          {photo ? (
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-semibold text-white sm:bottom-2 sm:left-2 sm:px-2 sm:py-1 sm:text-[11px]">
              <Check className="mr-1 inline h-3 w-3" />
              Terminé
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:block sm:space-y-2 sm:p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">
              {photoSlot.label}
              {photoSlot.required ? (
                <span className="ml-1 text-red-500">*</span>
              ) : null}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500 sm:line-clamp-none sm:text-xs">
              {photoSlot.description}
            </p>
          </div>
          {canEdit ? (
            <label className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 sm:h-9 sm:gap-2 sm:px-0 sm:text-xs">
              <Camera className="h-3.5 w-3.5" />
              {photo ? "Reprendre" : "Prendre la photo"}
              <input
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={isUploading}
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onUpload(file);
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RiskConversationPanel({
  onChange,
  vehicle,
}: {
  onChange: (vehicle: RiskVehicle) => void;
  vehicle: RiskVehicle;
}) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<ConversationAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasPositionedMessages = useRef(false);
  const messages = vehicle.conversation?.messages ?? [];
  const canPost = vehicle.status === "SUBMITTED";
  const lastMessageId = messages.at(-1)?.id;

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !lastMessageId) return;

    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({
        behavior: hasPositionedMessages.current ? "smooth" : "auto",
        top: container.scrollHeight,
      });
      hasPositionedMessages.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [lastMessageId]);

  async function addAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (attachments.length + files.length > 5) {
      toast.error("Maximum 5 documents par message.");
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = [] as ConversationAttachment[];
      for (const file of files)
        uploaded.push(await riskService.uploadAttachment(vehicle.id, file));
      setAttachments((current) => [...current, ...uploaded]);
    } catch {
      toast.error("Impossible d'envoyer un document.");
    } finally {
      setIsUploading(false);
    }
  }

  async function sendMessage() {
    if (!body.trim() && !attachments.length) return;
    setIsSending(true);
    try {
      const updated = await riskService.createMessage(vehicle.id, {
        attachments,
        body: body.trim() || undefined,
      });
      onChange(updated);
      setBody("");
      setAttachments([]);
      toast.success("Commentaire envoye.");
    } catch {
      toast.error("Impossible d'envoyer le commentaire.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card className="overflow-hidden border-gray-200 shadow-none">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <MessageSquareText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-950">
              Commentaires et documents
            </h2>
            <p className="truncate text-xs text-gray-500">
              Suivi de l’analyse du véhicule
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
          {messages.length} message{messages.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 px-4 py-3">
        <UsersRound className="mr-1 h-3.5 w-3.5 text-gray-400" />
        {vehicle.assignments.map((assignment) => (
          <span
            className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700"
            key={assignment.id}
          >
            {assignment.user.firstName} {assignment.user.lastName}
            {assignment.role === "PRIMARY" ? " · Responsable" : ""}
          </span>
        ))}
      </div>

      {vehicle.status === "DRAFT" ? (
        <p className="m-4 rounded-md bg-gray-50 p-3 text-sm text-gray-500">
          Les commentaires seront ouverts après la transmission du dossier.
        </p>
      ) : messages.length ? (
        <div
          aria-live="polite"
          className="h-[clamp(20rem,52vh,34rem)] space-y-3 overflow-y-auto overscroll-contain bg-gray-50/60 p-4 [scrollbar-gutter:stable]"
          ref={messagesContainerRef}
        >
          {messages.map((message) => {
            const mine = message.authorId === currentUserId;
            return (
              <article
                className={cn(
                  "max-w-[92%] rounded-lg border px-3 py-2.5",
                  mine
                    ? "ml-auto border-teal-100 bg-teal-50"
                    : "border-gray-200 bg-white",
                )}
                key={message.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-semibold text-gray-900">
                    {mine
                      ? "Vous"
                      : message.author
                        ? `${message.author.firstName} ${message.author.lastName}`
                        : "Utilisateur supprimé"}
                  </p>
                  <time
                    className="shrink-0 text-[10px] text-gray-400"
                    dateTime={message.createdAt}
                  >
                    {formatMessageDate(message.createdAt)}
                  </time>
                </div>
                {message.body ? (
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-5 text-gray-700">
                    {message.body}
                  </p>
                ) : null}
                {message.attachments.length ? (
                  <div className="mt-2 space-y-1.5">
                    {message.attachments.map((attachment) => (
                      <a
                        className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-teal-800 hover:bg-teal-50"
                        href={cloudinaryAssetUrl(attachment.secureUrl)}
                        key={attachment.id ?? attachment.publicId}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="truncate">
                          {attachment.originalName}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="bg-gray-50/60 px-4 py-12 text-center text-sm text-gray-500">
          Aucun commentaire pour le moment.
        </p>
      )}

      {canPost ? (
        <div className="space-y-3 border-t border-gray-100 bg-white p-4">
          <textarea
            className="min-h-20 w-full resize-y rounded-md border border-gray-200 p-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Écrire un commentaire sur le véhicule…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          {attachments.length ? (
            <div className="space-y-1.5">
              {attachments.map((attachment) => (
                <div
                  className="flex items-center gap-2 rounded-md bg-gray-50 px-2.5 py-2 text-xs"
                  key={attachment.publicId}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="min-w-0 flex-1 truncate">
                    {attachment.originalName}
                  </span>
                  <button
                    aria-label="Retirer"
                    type="button"
                    onClick={() =>
                      setAttachments((current) =>
                        current.filter(
                          (item) => item.publicId !== attachment.publicId,
                        ),
                      )
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <Paperclip className="h-3.5 w-3.5" />
              {isUploading ? "Envoi..." : "Joindre"}
              <input
                accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                disabled={isUploading}
                multiple
                type="file"
                onChange={(event) => void addAttachments(event)}
              />
            </label>
            <Button
              disabled={
                isSending ||
                isUploading ||
                (!body.trim() && !attachments.length)
              }
              size="sm"
              type="button"
              onClick={() => void sendMessage()}
            >
              {isSending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Envoyer
            </Button>
          </div>
        </div>
      ) : vehicle.status === "CLOSED" ? (
        <p className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          <Lock className="h-4 w-4" />
          Dossier clos, échanges en lecture seule.
        </p>
      ) : null}
    </Card>
  );
}

function primaryName(vehicle: RiskVehicle) {
  const user = vehicle.assignments.find(
    (assignment) => assignment.role === "PRIMARY",
  )?.user;
  return user ? `${user.firstName} ${user.lastName}` : "Non assigné";
}

function CompactInformation({
  accent = false,
  label,
  value,
}: {
  accent?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-gray-200 bg-white px-2.5 py-1.5">
      <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p
        className={cn(
          "truncate text-[11px] font-semibold leading-4",
          accent ? "text-teal-700" : "text-gray-900",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function RiskStatusProgress({
  label,
  status,
}: {
  label: string;
  status: RiskVehicle["status"];
}) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
      <span
        className={cn(
          "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-semibold",
          statusTone(status),
        )}
      >
        {status === "CLOSED" ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              status === "DRAFT" ? "bg-gray-500" : "bg-amber-500",
            )}
          />
        )}
        {label}
      </span>
    </div>
  );
}

function statusTone(status: RiskVehicle["status"]) {
  return status === "DRAFT"
    ? "bg-gray-100 text-gray-700"
    : status === "CLOSED"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-amber-100 text-amber-800";
}

function damageGroups(photos: RiskPhoto[]) {
  return [
    ...new Set(
      photos
        .map((photo) => photo.damageGroupId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

function firstIncompleteDamageGroup(photos: RiskPhoto[]) {
  return (
    damageGroups(photos).find((groupId) => {
      const group = photos.filter((photo) => photo.damageGroupId === groupId);
      return (
        !group.some((photo) => photo.category === "DAMAGE_WIDE") ||
        !group.some((photo) => photo.category === "DAMAGE_CLOSE_UP")
      );
    }) ?? null
  );
}

function buildGallerySections(photos: RiskPhoto[]): GallerySection[] {
  const knownPhotoIds = new Set<string>();
  const sections: GallerySection[] = [];

  photoSections.slice(0, 2).forEach((section, sectionIndex) => {
    const title = sectionIndex === 0 ? "Extérieur" : "Intérieur";
    const items = section.slots.flatMap((photoSlot) => {
      const photo = photos.find((item) => item.slotKey === photoSlot.category);
      if (!photo) return [];
      knownPhotoIds.add(photo.id);
      return [{ label: photoSlot.label, photo, section: title }];
    });
    if (items.length) sections.push({ items, title });
  });

  const tireItems: GalleryPhoto[] = [];
  for (const tire of tires) {
    const globalPhoto = photos.find(
      (photo) => photo.slotKey === tire.globalCategory,
    );
    if (globalPhoto) {
      knownPhotoIds.add(globalPhoto.id);
      tireItems.push({
        label: `${tire.label} · Vue globale`,
        photo: globalPhoto,
        section: "Pneus",
      });
    }

    const wearPhoto = photos.find(
      (photo) => photo.slotKey === `tire:${tire.id}:wear`,
    );
    if (wearPhoto) {
      knownPhotoIds.add(wearPhoto.id);
      tireItems.push({
        label: `${tire.label} · Usure`,
        photo: wearPhoto,
        section: "Pneus",
      });
    }

    photos
      .filter(
        (photo) =>
          photo.category === "TIRE_DAMAGE" &&
          photo.slotKey.startsWith(`tire:${tire.id}:damage:`),
      )
      .forEach((photo, index) => {
        knownPhotoIds.add(photo.id);
        tireItems.push({
          label: `${tire.label} · Dommage ${index + 1}`,
          photo,
          section: "Pneus",
        });
      });
  }
  if (tireItems.length) sections.push({ items: tireItems, title: "Pneus" });

  const damageItems: GalleryPhoto[] = [];
  damageGroups(photos).forEach((groupId, groupIndex) => {
    const groupPhotos = photos.filter(
      (photo) => photo.damageGroupId === groupId,
    );
    for (const category of ["DAMAGE_WIDE", "DAMAGE_CLOSE_UP"] as const) {
      const photo = groupPhotos.find((item) => item.category === category);
      if (!photo) continue;
      knownPhotoIds.add(photo.id);
      damageItems.push({
        label: `Dommage ${groupIndex + 1} · ${category === "DAMAGE_WIDE" ? "Vue générale" : "Vue rapprochée"}`,
        photo,
        section: "Dommages carrosserie",
      });
    }
  });
  if (damageItems.length) {
    sections.push({ items: damageItems, title: "Dommages carrosserie" });
  }

  const remainingItems = photos
    .filter((photo) => !knownPhotoIds.has(photo.id))
    .map((photo, index) => ({
      label: `Photo complémentaire ${index + 1}`,
      photo,
      section: "Autres photos",
    }));
  if (remainingItems.length) {
    sections.push({ items: remainingItems, title: "Autres photos" });
  }

  return sections;
}

function initialPhotoStep(photos: RiskPhoto[]) {
  const uploadedCategories = new Set(photos.map((photo) => photo.category));
  const firstIncompleteSection = photoSections.findIndex((section) =>
    section.slots.some(
      (photoSlot) =>
        photoSlot.required && !uploadedCategories.has(photoSlot.category),
    ),
  );
  return firstIncompleteSection === -1 ? 3 : firstIncompleteSection;
}

function initialTireIndex(photos: RiskPhoto[]) {
  const firstIncomplete = tires.findIndex(
    (tire) => !photos.some((photo) => photo.slotKey === tire.globalCategory),
  );
  return firstIncomplete === -1 ? 0 : firstIncomplete;
}

function createCompatibleUuid() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function isJourneyStepComplete(
  index: number,
  photos: RiskPhoto[],
  incompleteDamageCount: number,
  canSubmit: boolean,
) {
  const section = photoSections[index];
  if (section) {
    const uploadedCategories = new Set(photos.map((photo) => photo.category));
    return section.slots.every(
      (photoSlot) =>
        !photoSlot.required || uploadedCategories.has(photoSlot.category),
    );
  }
  if (index === 3) return incompleteDamageCount === 0;
  return canSubmit;
}

function slot(
  category: RiskPhotoCategory,
  label: string,
  description: string,
  required: boolean,
  sortOrder: number,
): PhotoSlot {
  return { category, description, label, required, sortOrder };
}

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
