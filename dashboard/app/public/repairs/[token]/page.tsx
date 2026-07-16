"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cloudinaryPreviewUrl, cloudinaryThumbnailUrl } from "@/lib/damage-photo";
import { formatDate, formatLicensePlate } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { PublicVehicleCheckShare, VehicleCheckItem } from "@/types/business";

type RepairPhoto = NonNullable<VehicleCheckItem["photos"]>[number];
type PhotoGallery = {
  index: number;
  photos: RepairPhoto[];
  title: string;
};

export default function PublicRepairRequestPage() {
  const params = useParams<{ token: string }>();
  const [share, setShare] = useState<PublicVehicleCheckShare | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmingTakeCharge, setIsConfirmingTakeCharge] = useState(false);
  const [isTakingCharge, setIsTakingCharge] = useState(false);
  const [gallery, setGallery] = useState<PhotoGallery | null>(null);

  useEffect(() => {
    void businessService
      .publicVehicleCheckShare(params.token)
      .then(setShare)
      .catch(() => setShare(null))
      .finally(() => setIsLoading(false));
  }, [params.token]);

  const items = useMemo(() => share?.vehicleCheck.items ?? [], [share?.vehicleCheck.items]);

  useEffect(() => {
    if (!gallery) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setGallery(null);
      }

      if (event.key === "ArrowLeft") {
        setGallery((current) => (current ? { ...current, index: previousPhotoIndex(current) } : current));
      }

      if (event.key === "ArrowRight") {
        setGallery((current) => (current ? { ...current, index: nextPhotoIndex(current) } : current));
      }
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
        <p className="text-sm font-semibold text-slate-500">Chargement de la demande...</p>
      </main>
    );
  }

  if (!share) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-950">Demande introuvable</p>
          <p className="mt-2 text-sm text-slate-500">Ce lien public n'est pas disponible.</p>
        </div>
      </main>
    );
  }

  const vehicleCheck = share.vehicleCheck;
  async function takeCharge() {
    setIsTakingCharge(true);
    try {
      const updatedShare = await businessService.takeChargePublicVehicleCheckShare(params.token);
      setShare(updatedShare);
      setIsConfirmingTakeCharge(false);
    } finally {
      setIsTakingCharge(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-4">
      <div className="mx-auto max-w-4xl space-y-3">
        <PublicPageHeader
          isTakingCharge={isTakingCharge}
          externalRepairContact={share.externalRepairContact}
          takenInChargeAt={share.takenInChargeAt}
          vehicleRecoveredAt={share.vehicleRecoveredAt}
          onTakeCharge={() => setIsConfirmingTakeCharge(true)}
        />

        <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">Demande de devis reparations</p>
              <h1 className="mt-1 text-xl font-bold text-slate-950">
                {formatLicensePlate(vehicleCheck.licensePlate, vehicleCheck.licensePlateCountry, vehicleCheck.licensePlateRaw)}
              </h1>
              <p className="mt-0.5 text-sm font-medium text-slate-600">
                {vehicleCheck.manufacturer?.name ?? "Constructeur"} {vehicleCheck.vehicleModel?.name ?? ""}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 sm:text-right">
              <Info label="Date controle" value={formatDate(vehicleCheck.checkDate)} />
              <Info label="Ville" value={vehicleCheck.city} />
              <Info label="Reparations" value={`${items.length}`} />
            </div>
          </div>
        </header>

        <RepairsTable
          items={items}
          onOpenPhoto={(item, photos, photoIndex) => setGallery({ photos, index: photoIndex, title: item.vehiclePart.name })}
        />

        {vehicleCheck.notes?.trim() ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-950">Observations</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{vehicleCheck.notes}</p>
          </section>
        ) : null}
      </div>
      {isConfirmingTakeCharge ? (
        <TakeChargeConfirmDialog
          isSubmitting={isTakingCharge}
          onClose={() => setIsConfirmingTakeCharge(false)}
          onConfirm={takeCharge}
        />
      ) : null}
      {gallery ? <PhotoGalleryModal gallery={gallery} onClose={() => setGallery(null)} onChange={setGallery} /> : null}
    </main>
  );
}

function PublicPageHeader({
  isTakingCharge,
  externalRepairContact,
  onTakeCharge,
  takenInChargeAt,
  vehicleRecoveredAt,
}: {
  externalRepairContact?: PublicVehicleCheckShare["externalRepairContact"];
  isTakingCharge: boolean;
  onTakeCharge: () => void;
  takenInChargeAt?: string | null;
  vehicleRecoveredAt?: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">Demande de devis</p>
          <p className="truncate text-xs font-medium text-slate-500">Reparations selectionnees</p>
        </div>
      </div>
      {vehicleRecoveredAt ? (
        <div className="flex shrink-0 items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            Vehicule recupere
            {externalRepairContact ? ` chez ${externalRepairContactLabel(externalRepairContact)}` : ""} le{" "}
            {formatShortDateTime(vehicleRecoveredAt)}
          </span>
        </div>
      ) : takenInChargeAt ? (
        <div className="flex shrink-0 items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            Pris en charge{externalRepairContact ? ` par ${externalRepairContactLabel(externalRepairContact)}` : ""} le{" "}
            {formatShortDateTime(takenInChargeAt)}
          </span>
        </div>
      ) : (
        <button
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={isTakingCharge}
          onClick={onTakeCharge}
        >
          {isTakingCharge ? "Validation..." : "Prendre en charge"}
        </button>
      )}
    </div>
  );
}

function TakeChargeConfirmDialog({
  isSubmitting,
  onClose,
  onConfirm,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-950">Confirmer la prise en charge ?</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Cette action indique au donneur d'ordre que vous prenez en charge cette demande de devis.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            className="h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? "Validation..." : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RepairsTable({
  items,
  onOpenPhoto,
}: {
  items: VehicleCheckItem[];
  onOpenPhoto: (item: VehicleCheckItem, photos: RepairPhoto[], index: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-3 py-2">
        <h2 className="text-sm font-bold text-slate-950">Reparations a chiffrer</h2>
      </div>
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
              <tr>
                <th className="w-12 px-3 py-2">#</th>
                <th className="px-3 py-2">Element</th>
                <th className="px-3 py-2">Operation</th>
                <th className="w-16 px-3 py-2 text-center">Qte</th>
                <th className="px-3 py-2">Piece</th>
                <th className="w-56 px-3 py-2">Photos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr className="align-top" key={item.id}>
                  <td className="px-3 py-3 text-xs font-bold text-slate-400">{index + 1}</td>
                  <td className="px-3 py-3">
                    <p className="font-bold text-slate-950">{item.vehiclePart.name}</p>
                    {item.comment?.trim() ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.comment}</p> : null}
                    {item.operationalComment?.trim() ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">Suivi : {item.operationalComment}</p> : null}
                  </td>
                  <td className="px-3 py-3 font-medium text-teal-700">{item.repairType.name}</td>
                  <td className="px-3 py-3 text-center font-bold text-slate-950">{item.quantity}</td>
                  <td className="px-3 py-3">
                    <PartOrderBadge item={item} />
                  </td>
                  <td className="px-3 py-3">
                    <PhotoCell item={item} onOpenPhoto={onOpenPhoto} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 text-sm text-slate-500">Aucune reparation selectionnee.</div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function PhotoCell({
  item,
  onOpenPhoto,
}: {
  item: VehicleCheckItem;
  onOpenPhoto: (item: VehicleCheckItem, photos: RepairPhoto[], index: number) => void;
}) {
  if (!item.photos?.length) {
    return <span className="text-xs font-semibold text-slate-400">Aucune photo</span>;
  }

  return (
    <div className="flex gap-1.5">
      {item.photos.slice(0, 3).map((photo, index) => (
        <button
          aria-label={`Voir la photo ${index + 1}`}
          className="group block h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50"
          key={photo.publicId}
          type="button"
          onClick={() => onOpenPhoto(item, item.photos ?? [], index)}
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
      {item.photos.length > 3 ? (
        <button
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500"
          type="button"
          onClick={() => onOpenPhoto(item, item.photos ?? [], 3)}
        >
          +{item.photos.length - 3}
        </button>
      ) : null}
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

  if (!photo) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="relative flex max-h-full w-full max-w-5xl flex-col gap-3" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">{gallery.title}</p>
            <p className="text-xs font-medium text-slate-500">
              Photo {gallery.index + 1} / {gallery.photos.length}
            </p>
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
          <img
            alt="Degat constate"
            className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl"
            decoding="async"
            src={cloudinaryPreviewUrl(photo)}
          />
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

function preloadGalleryPhotos(photos: RepairPhoto[], index: number) {
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

function PartOrderBadge({ item }: { item: VehicleCheckItem }) {
  if (!item.partOrderRequired) {
    return <Badge variant="outline">Pas de commande piece</Badge>;
  }

  if (item.partOrderStatus === "ORDERED") {
    return <Badge variant="success">Piece commandee</Badge>;
  }

  return <Badge variant="warning">Piece a commander</Badge>;
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function externalRepairContactLabel(contact: NonNullable<PublicVehicleCheckShare["externalRepairContact"]>) {
  return contact.companyName?.trim() || contact.name;
}
