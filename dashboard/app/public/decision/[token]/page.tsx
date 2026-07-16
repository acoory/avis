"use client";

import { FileText, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DamagePhotoGallery } from "@/components/business/damage-photo-gallery";
import { VehicleCheckStatusBadge } from "@/components/business/decision-badge";
import { VehicleCheckConversationPanel } from "@/components/business/vehicle-check-conversation-panel";
import { Badge } from "@/components/ui/badge";
import { cloudinaryThumbnailUrl } from "@/lib/damage-photo";
import { formatDate, formatLicensePlate } from "@/lib/format";
import { businessService } from "@/services/business.service";
import {
  PublicVehicleCheckDecisionShare,
  VehicleCheckItem,
} from "@/types/business";
import { PublicDecisionAccessStatus } from "@/types/conversations";

type DecisionPhoto = NonNullable<VehicleCheckItem["photos"]>[number];
type PhotoGallery = {
  index: number;
  photos: DecisionPhoto[];
  title: string;
};

export default function PublicDecisionRequestPage() {
  const params = useParams<{ token: string }>();
  const [share, setShare] = useState<PublicVehicleCheckDecisionShare | null>(
    null,
  );
  const [access, setAccess] = useState<PublicDecisionAccessStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [code, setCode] = useState("");
  const [gallery, setGallery] = useState<PhotoGallery | null>(null);

  const loadShare = useCallback(async () => {
    const nextShare = await businessService.publicVehicleCheckDecisionShare(
      params.token,
    );
    setShare(nextShare);
  }, [params.token]);

  const loadAccess = useCallback(async () => {
    setIsLoading(true);
    try {
      let nextAccess: PublicDecisionAccessStatus;
      try {
        nextAccess = await businessService.publicDecisionAccess(params.token);
      } catch {
        // An expired application token is cleared by the API interceptor. Retry
        // once so the personal-code screen remains available.
        nextAccess = await businessService.publicDecisionAccess(params.token);
      }
      setAccess(nextAccess);
      if (nextAccess.authenticated) await loadShare();
    } catch {
      setAccess(null);
      setShare(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadShare, params.token]);

  useEffect(() => {
    queueMicrotask(() => void loadAccess());
  }, [loadAccess]);

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.replace(/[^A-Z2-9]/g, "").length !== 8) {
      toast.error("Saisissez les 8 caracteres de votre code personnel.");
      return;
    }
    setIsVerifying(true);
    try {
      const nextAccess = await businessService.verifyPublicDecisionAccessCode(
        params.token,
        code,
      );
      setAccess(nextAccess);
      await loadShare();
      setCode("");
      toast.success("Identite verifiee. Cet appareil est maintenant reconnu.");
    } catch {
      toast.error("Code incorrect ou temporairement bloque.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function sendCode() {
    setIsSendingCode(true);
    try {
      const result = await businessService.sendPublicDecisionAccessCode(
        params.token,
      );
      setAccess((current) =>
        current ? { ...current, hasPersonalCode: true } : current,
      );
      toast.success(`Code personnel envoye a ${result.maskedEmail}.`);
    } catch {
      toast.error("Le code ne peut pas etre renvoye pour le moment.");
    } finally {
      setIsSendingCode(false);
    }
  }

  async function forgetDevice() {
    try {
      const nextAccess = await businessService.forgetPublicDecisionAccess(
        params.token,
      );
      setAccess(nextAccess);
      setShare(null);
      toast.success("Cet appareil n'est plus reconnu.");
    } catch {
      toast.error("Impossible d'oublier cet appareil.");
    }
  }

  const items = useMemo(
    () => share?.vehicleCheck.items ?? [],
    [share?.vehicleCheck.items],
  );
  const vehicleCheck = share?.vehicleCheck;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-sm font-semibold text-slate-500">
          Chargement du dossier...
        </p>
      </main>
    );
  }

  if (access && !access.authenticated) {
    return (
      <PublicAccessGate
        access={access}
        code={code}
        isSendingCode={isSendingCode}
        isVerifying={isVerifying}
        onCodeChange={setCode}
        onSendCode={() => void sendCode()}
        onSubmit={verifyCode}
      />
    );
  }

  if (!share || !vehicleCheck) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <FileText className="mx-auto h-9 w-9 text-slate-400" />
          <h1 className="mt-3 text-lg font-bold text-slate-950">
            Dossier indisponible
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Le lien est invalide ou n&apos;est plus actif.
          </p>
        </div>
      </main>
    );
  }

  const licensePlate = formatLicensePlate(
    vehicleCheck.licensePlate,
    vehicleCheck.licensePlateCountry,
    vehicleCheck.licensePlateRaw,
  );
  const vehicleLabel = [
    vehicleCheck.manufacturer?.name,
    vehicleCheck.vehicleModel?.name,
  ]
    .filter(Boolean)
    .join(" ");
  const collaboratorName = [
    vehicleCheck.collaborator?.firstName,
    vehicleCheck.collaborator?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(400px,480px)] lg:grid-rows-[auto_minmax(0,1fr)] lg:items-start">
        <section className="rounded-lg border border-slate-200 bg-white px-4 py-4 sm:px-5 lg:col-start-1 lg:row-start-1">
          <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                Aide a la decision
              </p>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">
                  {licensePlate}
                </h1>
                <p className="truncate text-sm font-medium text-slate-500">
                  {vehicleLabel || "Vehicule"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <VehicleCheckStatusBadge status={vehicleCheck.status} />
              {access?.mode === "PERSONAL_CODE" ? (
                <button
                  className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                  type="button"
                  onClick={() => void forgetDevice()}
                >
                  Oublier cet appareil
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 lg:grid-cols-4">
            <HeaderInfo label="Controle" value={vehicleCheck.checkNumber} />
            <HeaderInfo
              label="Date"
              value={formatDate(vehicleCheck.checkDate)}
            />
            <HeaderInfo
              label="Agence"
              value={vehicleCheck.agency?.name ?? "-"}
            />
            <HeaderInfo
              label="Collaborateur"
              value={
                collaboratorName || vehicleCheck.collaborator?.email || "-"
              }
            />
          </div>

          {share.requestComment?.trim() ? (
            <div className="flex flex-col gap-1 rounded-md border border-teal-100 bg-teal-50 px-3 py-2.5 sm:flex-row sm:items-baseline sm:gap-3">
              <p className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-teal-700">
                Commentaire transmis
              </p>
              <p className="whitespace-pre-wrap text-sm text-teal-950">
                {share.requestComment}
              </p>
            </div>
          ) : null}
          </div>
        </section>

        <VehicleCheckConversationPanel
          className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[calc(100dvh-2rem)]"
          publicActorId={access?.actorId ?? share.managerId}
          publicToken={params.token}
          vehicleCheck={vehicleCheck}
        />

        <section className="min-w-0 lg:col-start-1 lg:row-start-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              Reparations controlees
            </h2>
            <Badge variant="outline">{items.length} ligne(s)</Badge>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {items.map((item, index) => (
              <article
                className={
                  index
                    ? "scroll-mt-20 border-t border-slate-100"
                    : "scroll-mt-20"
                }
                id={`repair-${item.id}`}
                key={item.id}
              >
                <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-950">
                        {item.vehiclePart.name}
                      </h3>
                      {!item.selectedForSummary ? (
                        <Badge variant="outline">Hors synthese</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.repairType.name}
                    </p>
                    {item.comment ? (
                      <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        {item.comment}
                      </p>
                    ) : null}
                  </div>
                  <PhotoStrip
                    item={item}
                    onOpenPhoto={(photos, photoIndex) =>
                      setGallery({
                        photos,
                        index: photoIndex,
                        title: item.vehiclePart.name,
                      })
                    }
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {gallery ? (
        <DamagePhotoGallery
          index={gallery.index}
          photos={gallery.photos}
          title={gallery.title}
          onClose={() => setGallery(null)}
          onIndexChange={(index) =>
            setGallery((current) => (current ? { ...current, index } : current))
          }
        />
      ) : null}
    </main>
  );
}

function PublicAccessGate({
  access,
  code,
  isSendingCode,
  isVerifying,
  onCodeChange,
  onSendCode,
  onSubmit,
}: {
  access: PublicDecisionAccessStatus;
  code: string;
  isSendingCode: boolean;
  isVerifying: boolean;
  onCodeChange: (value: string) => void;
  onSendCode: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-teal-700">
          Acces securise
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-950">
          Saisissez votre code personnel
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          La demande et la conversation seront affichees apres verification de
          votre identite.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Code personnel permanent
            </span>
            <span className="relative block">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoComplete="one-time-code"
                autoFocus
                className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 font-mono text-base font-semibold uppercase tracking-[0.18em] text-slate-950 outline-none transition placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                inputMode="text"
                maxLength={9}
                placeholder="XXXX-XXXX"
                value={code}
                onChange={(event) =>
                  onCodeChange(formatPersonalCode(event.target.value))
                }
              />
            </span>
          </label>
          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              isVerifying || code.replace(/[^A-Z2-9]/g, "").length !== 8
            }
            type="submit"
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {isVerifying ? "Verification..." : "Ouvrir la demande"}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-5 text-slate-600">
                Votre code est indique dans chaque email envoye a{" "}
                <strong>{access.maskedEmail}</strong>.
              </p>
              <button
                className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                disabled={isSendingCode}
                type="button"
                onClick={onSendCode}
              >
                {isSendingCode
                  ? "Envoi en cours..."
                  : access.hasPersonalCode
                    ? "Renvoyer mon code par email"
                    : "Recevoir mon code par email"}
              </button>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] leading-4 text-slate-400">
          Apres validation, cet appareil sera reconnu automatiquement.
        </p>
      </section>
    </main>
  );
}

function formatPersonalCode(value: string) {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-HJ-NP-Z2-9]/g, "")
    .slice(0, 8);
  return normalized.length > 4
    ? `${normalized.slice(0, 4)}-${normalized.slice(4)}`
    : normalized;
}

function HeaderInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="truncate text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function PhotoStrip({
  item,
  onOpenPhoto,
}: {
  item: VehicleCheckItem;
  onOpenPhoto: (photos: DecisionPhoto[], index: number) => void;
}) {
  if (!item.photos?.length) {
    return (
      <span className="text-xs font-semibold text-slate-400 lg:pt-1">
        Aucune photo
      </span>
    );
  }

  return (
    <div className="flex gap-1.5 lg:justify-end">
      {item.photos.slice(0, 3).map((photo, index) => (
        <button
          aria-label={`Voir la photo ${index + 1}`}
          className="group block h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50"
          key={photo.publicId}
          type="button"
          onClick={() => onOpenPhoto(item.photos ?? [], index)}
        >
          <img
            alt="Degat constate"
            className="h-full w-full object-cover transition group-hover:scale-105"
            decoding="async"
            loading="lazy"
            src={cloudinaryThumbnailUrl(photo, 160)}
          />
        </button>
      ))}
    </div>
  );
}
