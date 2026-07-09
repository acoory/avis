"use client";

import { ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DecisionBadge, VehicleCheckStatusBadge } from "@/components/business/decision-badge";
import { Badge } from "@/components/ui/badge";
import { cloudinaryPreviewUrl, cloudinaryThumbnailUrl } from "@/lib/damage-photo";
import { formatDate, formatLicensePlate, formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { PublicVehicleCheckDecisionShare, VehicleCheckItem } from "@/types/business";

type DecisionPhoto = NonNullable<VehicleCheckItem["photos"]>[number];
type PhotoGallery = {
  index: number;
  photos: DecisionPhoto[];
  title: string;
};

export default function PublicDecisionRequestPage() {
  const params = useParams<{ token: string }>();
  const [share, setShare] = useState<PublicVehicleCheckDecisionShare | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gallery, setGallery] = useState<PhotoGallery | null>(null);

  useEffect(() => {
    void businessService
      .publicVehicleCheckDecisionShare(params.token)
      .then(setShare)
      .catch(() => setShare(null))
      .finally(() => setIsLoading(false));
  }, [params.token]);

  const items = useMemo(() => share?.vehicleCheck.items ?? [], [share?.vehicleCheck.items]);
  const vehicleCheck = share?.vehicleCheck;

  useEffect(() => {
    if (!gallery) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setGallery(null);
      if (event.key === "ArrowLeft") setGallery((current) => (current ? { ...current, index: previousPhotoIndex(current) } : current));
      if (event.key === "ArrowRight") setGallery((current) => (current ? { ...current, index: nextPhotoIndex(current) } : current));
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gallery]);

  useEffect(() => {
    if (!gallery?.photos.length) return;
    preloadGalleryPhotos(gallery.photos, gallery.index);
  }, [gallery?.index, gallery?.photos]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-sm font-semibold text-slate-500">Chargement du dossier...</p>
      </main>
    );
  }

  if (!share || !vehicleCheck) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <FileText className="mx-auto h-9 w-9 text-slate-400" />
          <h1 className="mt-3 text-lg font-bold text-slate-950">Dossier indisponible</h1>
          <p className="mt-2 text-sm text-slate-500">Le lien est invalide ou n'est plus actif.</p>
        </div>
      </main>
    );
  }

  const licensePlate = formatLicensePlate(
    vehicleCheck.licensePlate,
    vehicleCheck.licensePlateCountry,
    vehicleCheck.licensePlateRaw,
  );
  const vehicleLabel = [vehicleCheck.manufacturer?.name, vehicleCheck.vehicleModel?.name].filter(Boolean).join(" ");
  const collaboratorName = [vehicleCheck.collaborator?.firstName, vehicleCheck.collaborator?.lastName].filter(Boolean).join(" ");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Aide a la decision</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">{licensePlate}</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">{vehicleLabel || "Vehicule"}</p>
            </div>
            <VehicleCheckStatusBadge status={vehicleCheck.status} />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <InfoTile label="Controle" value={vehicleCheck.checkNumber} />
            <InfoTile label="Date" value={formatDate(vehicleCheck.checkDate)} />
            <InfoTile label="Agence" value={vehicleCheck.agency?.name ?? "-"} />
            <InfoTile label="Collaborateur" value={collaboratorName || vehicleCheck.collaborator?.email || "-"} />
          </div>

          {share.requestComment?.trim() ? (
            <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
              <p className="text-xs font-bold uppercase text-teal-700">Commentaire transmis</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-teal-950">{share.requestComment}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-950">Reparations controlees</h2>
          <Badge variant="outline">{items.length} ligne(s)</Badge>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {items.map((item, index) => (
            <article className={index ? "border-t border-slate-100" : ""} key={item.id}>
              <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-950">{item.vehiclePart.name}</h3>
                    <DecisionBadge status={item.decisionStatus} />
                    {!item.selectedForSummary ? <Badge variant="outline">Hors synthese</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.repairType.name} · Quantite {item.quantity}
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <InfoLine label="Economie" value={formatMoney(item.totalInternalSavingAmount)} />
                    <InfoLine label="Cout interne" value={formatMoney(item.totalInternalCost)} />
                  </div>
                  {item.decisionMessage ? <p className="mt-3 text-sm text-slate-600">{item.decisionMessage}</p> : null}
                  {item.comment ? (
                    <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{item.comment}</p>
                  ) : null}
                </div>
                <PhotoStrip item={item} onOpenPhoto={(photos, photoIndex) => setGallery({ photos, index: photoIndex, title: item.vehiclePart.name })} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {gallery ? <PhotoGalleryModal gallery={gallery} onChange={setGallery} onClose={() => setGallery(null)} /> : null}
    </main>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-semibold text-slate-500">{label}</span> <span className="font-bold text-slate-950">{value}</span>
    </p>
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
    return <span className="text-xs font-semibold text-slate-400 lg:pt-1">Aucune photo</span>;
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

function PhotoGalleryModal({
  gallery,
  onChange,
  onClose,
}: {
  gallery: PhotoGallery;
  onChange: (gallery: PhotoGallery) => void;
  onClose: () => void;
}) {
  const photo = gallery.photos[gallery.index];
  const hasMultiplePhotos = gallery.photos.length > 1;

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="relative flex max-h-full w-full max-w-5xl flex-col gap-3" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">{gallery.title}</p>
            <p className="text-xs font-medium text-slate-500">Photo {gallery.index + 1} / {gallery.photos.length}</p>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" type="button" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex min-h-0 items-center justify-center rounded-lg bg-black/30">
          {hasMultiplePhotos ? (
            <button
              aria-label="Photo precedente"
              className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow hover:bg-white"
              type="button"
              onClick={() => onChange({ ...gallery, index: previousPhotoIndex(gallery) })}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}
          <img alt="Degat constate" className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl" decoding="async" src={cloudinaryPreviewUrl(photo)} />
          {hasMultiplePhotos ? (
            <button
              aria-label="Photo suivante"
              className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow hover:bg-white"
              type="button"
              onClick={() => onChange({ ...gallery, index: nextPhotoIndex(gallery) })}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function previousPhotoIndex(gallery: PhotoGallery) {
  return gallery.index === 0 ? gallery.photos.length - 1 : gallery.index - 1;
}

function nextPhotoIndex(gallery: PhotoGallery) {
  return gallery.index === gallery.photos.length - 1 ? 0 : gallery.index + 1;
}

function preloadGalleryPhotos(photos: DecisionPhoto[], index: number) {
  const indexes = new Set([index, (index - 1 + photos.length) % photos.length, (index + 1) % photos.length]);

  indexes.forEach((photoIndex) => {
    const photo = photos[photoIndex];
    if (!photo) return;
    const image = new Image();
    image.src = cloudinaryPreviewUrl(photo);
  });
}
