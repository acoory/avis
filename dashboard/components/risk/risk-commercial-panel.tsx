"use client";

import { useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  CheckCircle2,
  Download,
  Link as LinkIcon,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  commercialSlots,
  commercialJourneySlots,
  downloadCommercialArchive,
} from "@/lib/risk-commercial";
import { cloudinaryImageUrl, optimizeDamagePhoto } from "@/lib/damage-photo";
import { riskService } from "@/services/risk.service";
import { CommercialEquipment, RiskVehicle } from "@/types/risk";
import { CommercialGallery } from "./commercial-gallery";

export function RiskCommercialPanel({
  vehicle,
  canClose,
  onChange,
}: {
  vehicle: RiskVehicle;
  canClose: boolean;
  onChange: (vehicle: RiskVehicle) => void;
}) {
  const [mileage, setMileage] = useState(
    vehicle.commercialMileage?.toString() ?? "",
  );
  const [equipment, setEquipment] = useState<CommercialEquipment>({
    sunroof: "TO_CHECK",
    serviceBook: "TO_CHECK",
    manual: "TO_CHECK",
    accessories: "TO_CHECK",
    secondScreen: "TO_CHECK",
    ...vehicle.commercialEquipment,
  });
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(() => {
    if (vehicle.commercialMileage == null) return 0;
    const initialSlots = commercialJourneySlots(
      vehicle.commercialEquipment?.secondScreen,
      vehicle.commercialPhotos ?? [],
    );
    const missing = initialSlots.findIndex((slot) => {
      const hasPhoto = vehicle.commercialPhotos?.some(
        (photo) => photo.slotKey === slot.key,
      );
      if (
        slot.key === "dashboard" &&
        !["PRESENT", "ABSENT"].includes(
          vehicle.commercialEquipment?.secondScreen ?? "TO_CHECK",
        )
      )
        return true;
      if (!slot.optional) return !hasPhoto;
      const presence =
        vehicle.commercialEquipment?.[slot.key as keyof CommercialEquipment];
      return presence === "ABSENT"
        ? !!hasPhoto
        : presence !== "PRESENT" || !hasPhoto;
    });
    return missing < 0 ? initialSlots.length + 1 : missing + 1;
  });
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const photos = vehicle.commercialPhotos ?? [];
  const editable = vehicle.status === "COMMERCIAL_PHOTOS";
  const required = commercialSlots.filter(
    (slot) =>
      !slot.optional ||
      equipment[slot.key as keyof CommercialEquipment] === "PRESENT",
  );
  const done = required.filter((slot) =>
    photos.some((photo) => photo.slotKey === slot.key),
  ).length;
  const validMileage =
    mileage.trim() !== "" &&
    Number.isInteger(Number(mileage)) &&
    Number(mileage) >= 0 &&
    Number(mileage) <= 10000000;
  const checked = Object.values(equipment).every(
    (value) => value !== "TO_CHECK",
  );
  const inconsistent = commercialSlots.some(
    (slot) =>
      slot.optional &&
      equipment[slot.key as keyof CommercialEquipment] === "ABSENT" &&
      photos.some((photo) => photo.slotKey === slot.key),
  );
  const complete =
    validMileage && checked && !inconsistent && done === required.length;

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
    } catch {
      toast.error("L’action a échoué. Vérifiez les informations et réessayez.");
    } finally {
      setBusy(null);
    }
  }
  async function save() {
    const updated = await riskService.saveCommercialDetails(
      vehicle.id,
      Number(mileage),
      equipment,
    );
    onChange(updated);
  }

  const journeySlots = commercialJourneySlots(equipment.secondScreen, photos);
  const lastStep = journeySlots.length + 1;
  const slot = step > 0 && step < lastStep ? journeySlots[step - 1] : null;
  const photo = slot
    ? photos.find((item) => item.slotKey === slot.key)
    : undefined;
  const screenQuestionAnswered = ["PRESENT", "ABSENT"].includes(
    equipment.secondScreen,
  );
  const presence = slot?.optional
    ? equipment[slot.key as keyof CommercialEquipment]
    : "PRESENT";
  const stepComplete =
    step === 0
      ? validMileage
      : slot?.key === "dashboard" && !screenQuestionAnswered
        ? false
        : slot
          ? presence === "ABSENT"
            ? !photo
            : presence === "PRESENT" && !!photo
          : complete;

  function goTo(next: number) {
    setStep(next);
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function navigate(next: number) {
    await run("save", async () => {
      if (validMileage) await save();
      goTo(next);
    });
  }

  function upload(file?: File) {
    if (!file || !slot) return;
    void run(slot.key, async () => {
      const optimized = await optimizeDamagePhoto(file, {
        maximumDimension: 2048,
        quality: 0.85,
      });
      await riskService.uploadCommercialPhoto(vehicle.id, optimized, {
        slotKey: slot.key,
      });
      onChange(await riskService.findOne(vehicle.id));
      setReviewed(false);
    });
  }

  return (
    <section className="min-w-0 w-full max-w-full space-y-5 rounded-2xl border border-teal-200 bg-white p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <Camera className="mt-1 h-5 w-5 shrink-0 text-teal-700" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Photos commerciales</h2>
          <p className="mt-1 text-sm text-slate-500">
            {editable
              ? "Le véhicule est traité. Complétez les photos, puis clôturez le dossier."
              : "Photos validées à la clôture du dossier."}
          </p>
        </div>
      </div>
      {editable ? (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
              <span>
                Étape {step + 1} sur {lastStep + 1}
              </span>
              <span>
                {done} / {required.length} photos enregistrées
              </span>
            </div>
            <progress
              aria-label="Progression du parcours"
              className="block h-2 w-full max-w-full accent-teal-700"
              value={step + 1}
              max={lastStep + 1}
            />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                {step === 0
                  ? "Préparation"
                  : (slot?.group ?? "Dernière vérification")}
              </p>
              <h3
                ref={heading}
                tabIndex={-1}
                className="scroll-mt-40 text-xl font-semibold outline-none md:scroll-mt-44"
              >
                {step === 0
                  ? "Kilométrage du véhicule"
                  : (slot?.label ?? "Récapitulatif")}
              </h3>
            </div>
            {step === 0 ? (
              <>
                <p className="text-sm text-slate-500">
                  Préparez le véhicule propre et rangé, puis relevez le
                  kilométrage au compteur.
                </p>
                <label className="block text-sm font-medium">
                  Kilométrage (km)
                  <input
                    className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 p-3 text-lg"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={10000000}
                    step={1}
                    value={mileage}
                    disabled={!!busy}
                    onChange={(event) => {
                      setMileage(event.target.value);
                      setReviewed(false);
                    }}
                    placeholder="Ex. 45200"
                  />
                </label>
                <p className="text-xs text-slate-500">
                  Chaque photo est enregistrée dès son envoi. Les informations
                  sont enregistrées en changeant d’étape ; vous pourrez
                  reprendre le parcours plus tard.
                </p>
              </>
            ) : slot ? (
              <>
                <p className="text-sm text-slate-500">{slot.hint}</p>
                {slot.key === "dashboard" && (
                  <fieldset className="min-w-0 space-y-2">
                    <legend className="text-sm font-medium">
                      Le véhicule a-t-il deux écrans séparés (compteur et écran
                      central) ?
                    </legend>
                    <div className="grid grid-cols-2 gap-3">
                      {(["PRESENT", "ABSENT"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          disabled={!!busy}
                          aria-pressed={equipment.secondScreen === value}
                          className={`min-h-12 rounded-xl border p-3 text-sm font-semibold ${equipment.secondScreen === value ? "border-teal-700 bg-teal-50 text-teal-800" : "border-slate-200"}`}
                          onClick={() => {
                            setEquipment({ ...equipment, secondScreen: value });
                            setReviewed(false);
                          }}
                        >
                          {value === "PRESENT"
                            ? "Oui, deux écrans"
                            : "Non, un seul"}
                        </button>
                      ))}
                    </div>
                    {equipment.secondScreen === "PRESENT" && (
                      <p className="text-sm text-slate-500">
                        Prenez d’abord le compteur avec le kilométrage, puis
                        l’autre écran à l’étape suivante.
                      </p>
                    )}
                  </fieldset>
                )}
                {slot.optional && slot.key !== "secondScreen" && (
                  <fieldset className="min-w-0 space-y-2">
                    <legend className="text-sm font-medium">
                      Cet élément est-il présent ?
                    </legend>
                    <div className="grid grid-cols-2 gap-3">
                      {(["PRESENT", "ABSENT"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={presence === value}
                          disabled={!!busy}
                          className={`min-h-12 rounded-xl border p-3 text-sm font-semibold ${presence === value ? "border-teal-700 bg-teal-50 text-teal-800" : "border-slate-200"}`}
                          onClick={() => {
                            setEquipment({ ...equipment, [slot.key]: value });
                            setReviewed(false);
                          }}
                        >
                          {value === "PRESENT" ? "Présent" : "Absent"}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {(presence === "PRESENT" || photo) &&
                  (slot.key !== "dashboard" || screenQuestionAnswered) && (
                    <>
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {photo ? (
                          <a
                            href={cloudinaryImageUrl(photo.secureUrl)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt={slot.label}
                              src={cloudinaryImageUrl(
                                photo.secureUrl.replace(
                                  "/upload/",
                                  "/upload/f_auto,q_auto,c_limit,w_1000/",
                                ),
                              )}
                              className="aspect-[4/3] max-h-[40vh] w-full object-contain"
                            />
                          </a>
                        ) : (
                          <div className="flex aspect-[4/3] max-h-[35vh] items-center justify-center">
                            <Camera className="h-12 w-12 text-slate-300" />
                          </div>
                        )}
                      </div>
                      {presence === "PRESENT" && (
                        <div className="grid min-w-0 grid-cols-1 gap-2">
                          <label
                            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 p-3 font-semibold text-white ${busy ? "opacity-50" : "cursor-pointer"}`}
                          >
                            {busy === slot.key ? (
                              <LoaderCircle className="h-5 w-5 animate-spin" />
                            ) : (
                              <Camera className="h-5 w-5" />
                            )}
                            {busy === slot.key
                              ? "Enregistrement…"
                              : photo
                                ? "Reprendre la photo"
                                : "Prendre la photo"}
                            <input
                              className="sr-only"
                              type="file"
                              accept="image/*"
                              capture="environment"
                              disabled={!!busy}
                              onChange={(event) => {
                                upload(event.target.files?.[0]);
                                event.target.value = "";
                              }}
                            />
                          </label>
                          <label
                            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border p-2 text-sm ${busy ? "opacity-50" : "cursor-pointer"}`}
                          >
                            <ImagePlus className="h-4 w-4" />
                            Choisir dans la galerie
                            <input
                              className="sr-only"
                              type="file"
                              accept="image/*"
                              disabled={!!busy}
                              onChange={(event) => {
                                upload(event.target.files?.[0]);
                                event.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      )}
                      {photo && (
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2 text-teal-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Photo enregistrée
                          </span>
                          <button
                            type="button"
                            className="min-h-11 px-2 text-red-700 underline"
                            disabled={!!busy}
                            onClick={() =>
                              void run(slot.key, async () => {
                                await riskService.removeCommercialPhoto(
                                  vehicle.id,
                                  photo.id,
                                );
                                onChange(await riskService.findOne(vehicle.id));
                                setReviewed(false);
                              })
                            }
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                      {presence === "ABSENT" && photo && (
                        <p role="alert" className="text-sm text-amber-700">
                          Supprimez la photo pour confirmer que cet élément est
                          absent.
                        </p>
                      )}
                    </>
                  )}
                {presence === "ABSENT" && !photo && (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    Aucune photo nécessaire. Vous pouvez passer à la suite.
                  </p>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={!!busy}
                  className="flex min-h-12 w-full items-center justify-between rounded-xl border p-3 text-sm"
                  onClick={() => void navigate(0)}
                >
                  <span>{Number(mileage).toLocaleString("fr-FR")} km</span>
                  <span className="text-teal-700">Modifier</span>
                </button>
                <div className="divide-y rounded-xl border">
                  {journeySlots.map((item, index) => {
                    const itemPhoto = photos.find(
                      (p) => p.slotKey === item.key,
                    );
                    const absent =
                      item.optional &&
                      equipment[item.key as keyof CommercialEquipment] ===
                        "ABSENT";
                    return (
                      <button
                        key={item.key}
                        type="button"
                        disabled={!!busy}
                        className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                        onClick={() => void navigate(index + 1)}
                      >
                        <span>{item.label}</span>
                        <span
                          className={
                            itemPhoto || absent
                              ? "text-teal-700"
                              : "text-amber-700"
                          }
                        >
                          {absent
                            ? "Absent"
                            : itemPhoto
                              ? "Vérifier"
                              : "À compléter"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Voir toutes les photos
                  </summary>
                  <div className="pt-4">
                    <CommercialGallery photos={photos} />
                  </div>
                </details>
                <label className="flex items-start gap-3 rounded-xl bg-teal-50 p-4 text-sm">
                  <input
                    className="mt-0.5 h-5 w-5 shrink-0 accent-teal-700"
                    type="checkbox"
                    checked={reviewed}
                    disabled={!!busy}
                    onChange={(event) => setReviewed(event.target.checked)}
                  />
                  J’ai vérifié la netteté, le kilométrage et masqué les données
                  personnelles sur les documents.
                </label>
                {!complete && (
                  <p role="alert" className="text-sm text-amber-700">
                    Complétez les éléments manquants avant la clôture.
                  </p>
                )}
                {!canClose && (
                  <p className="text-sm text-slate-500">
                    Les photos sont enregistrées. Le responsable du dossier
                    pourra les valider et clôturer.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 border-t bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6">
            <Button
              className="min-h-12"
              variant="outline"
              disabled={!!busy || step === 0}
              onClick={() => void navigate(step - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Précédent</span>
            </Button>
            {step < lastStep ? (
              <Button
                className="min-h-12 flex-1"
                disabled={!!busy || !stepComplete}
                onClick={() => void navigate(step + 1)}
              >
                {busy === "save" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                {step === lastStep - 1 ? "Voir le récapitulatif" : "Suivant"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : canClose ? (
              <Button
                className="min-h-12 flex-1 whitespace-normal"
                disabled={!!busy || !complete || !reviewed}
                onClick={() =>
                  void run("close", async () => {
                    await save();
                    onChange(await riskService.close(vehicle.id));
                    toast.success("Photos validées et dossier clôturé.");
                  })
                }
              >
                {busy === "close" && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Valider et clôturer le dossier
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!!busy}
              onClick={() =>
                void run("share", async () => {
                  const url = `${window.location.origin}/commercial/${vehicle.commercialShareToken}`;
                  setShareUrl(url);
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success("Lien copié, prêt à partager.");
                  } catch {
                    toast.info(
                      "Le lien est affiché ci-dessous pour le copier.",
                    );
                  }
                })
              }
            >
              <LinkIcon className="h-4 w-4" />
              Partager les photos commerciales
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() =>
                void run("download", () =>
                  downloadCommercialArchive(vehicle.commercialShareToken!),
                )
              }
            >
              <Download className="h-4 w-4" />
              {busy === "download"
                ? "Téléchargement…"
                : "Télécharger toutes les photos"}
            </Button>
          </div>
          {shareUrl && (
            <div className="space-y-2">
              <input
                aria-label="Lien de partage"
                className="w-full rounded-lg border p-2 text-sm"
                readOnly
                value={shareUrl}
                onFocus={(event) => event.target.select()}
              />
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-teal-700 underline"
              >
                Ouvrir la galerie publique
              </a>
              <p className="text-xs text-slate-500">
                Toute personne disposant de ce lien peut consulter les photos
                sans connexion.
              </p>
            </div>
          )}
          <CommercialGallery photos={photos} />
        </>
      )}
    </section>
  );
}
