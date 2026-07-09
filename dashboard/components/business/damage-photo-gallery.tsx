"use client";

import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cloudinaryPreviewUrl } from "@/lib/damage-photo";
import { DamagePhoto } from "@/types/business";

type DamagePhotoGalleryProps = {
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  photos: DamagePhoto[];
  title?: string;
};

export function DamagePhotoGallery({
  index,
  onClose,
  onIndexChange,
  photos,
  title = "Photo",
}: DamagePhotoGalleryProps) {
  const safeIndex = photos.length ? Math.min(Math.max(index, 0), photos.length - 1) : 0;
  const photo = photos[safeIndex];
  const hasMultiplePhotos = photos.length > 1;
  const imageUrl = useMemo(() => (photo ? cloudinaryPreviewUrl(photo) : ""), [photo]);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    setIsImageLoaded(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!photos.length) return;

    const indexes = new Set([
      safeIndex,
      (safeIndex - 1 + photos.length) % photos.length,
      (safeIndex + 1) % photos.length,
    ]);

    indexes.forEach((photoIndex) => {
      const galleryPhoto = photos[photoIndex];
      if (!galleryPhoto) return;
      const image = new Image();
      image.src = cloudinaryPreviewUrl(galleryPhoto);
    });
  }, [photos, safeIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && photos.length) {
        onIndexChange(safeIndex === 0 ? photos.length - 1 : safeIndex - 1);
      }
      if (event.key === "ArrowRight" && photos.length) {
        onIndexChange(safeIndex === photos.length - 1 ? 0 : safeIndex + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onIndexChange, photos.length, safeIndex]);

  function previousPhoto() {
    if (!photos.length) return;
    onIndexChange(safeIndex === 0 ? photos.length - 1 : safeIndex - 1);
  }

  function nextPhoto() {
    if (!photos.length) return;
    onIndexChange(safeIndex === photos.length - 1 ? 0 : safeIndex + 1);
  }

  if (!photo) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-3"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-5xl flex-col gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">{title}</p>
            <p className="text-xs font-medium text-slate-500">
              Photo {safeIndex + 1} / {photos.length}
            </p>
          </div>
          <button
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex min-h-[280px] items-center justify-center rounded-lg bg-black/30">
          {!isImageLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 rounded-lg bg-white/95 px-4 py-3 text-sm font-semibold text-slate-700 shadow">
                <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
                Chargement de la photo...
              </div>
            </div>
          ) : null}

          {hasMultiplePhotos ? (
            <button
              aria-label="Photo precedente"
              className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow hover:bg-white"
              type="button"
              onClick={previousPhoto}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}

          <img
            alt="Degat constate"
            className={[
              "max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl transition-opacity",
              isImageLoaded ? "opacity-100" : "opacity-0",
            ].join(" ")}
            decoding="async"
            src={imageUrl}
            onError={() => setIsImageLoaded(true)}
            onLoad={() => setIsImageLoaded(true)}
          />

          {hasMultiplePhotos ? (
            <button
              aria-label="Photo suivante"
              className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow hover:bg-white"
              type="button"
              onClick={nextPhoto}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
