"use client";

import { FileText } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DamagePhotoGallery } from "@/components/business/damage-photo-gallery";
import { VehicleCheckStatusBadge } from "@/components/business/decision-badge";
import { Badge } from "@/components/ui/badge";
import { cloudinaryThumbnailUrl } from "@/lib/damage-photo";
import { formatDate, formatLicensePlate } from "@/lib/format";
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
                    {!item.selectedForSummary ? <Badge variant="outline">Hors synthese</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.repairType.name}</p>
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

      {gallery ? (
        <DamagePhotoGallery
          index={gallery.index}
          photos={gallery.photos}
          title={gallery.title}
          onClose={() => setGallery(null)}
          onIndexChange={(index) => setGallery((current) => (current ? { ...current, index } : current))}
        />
      ) : null}
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
