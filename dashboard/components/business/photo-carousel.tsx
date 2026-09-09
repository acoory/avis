"use client";

import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RotatablePhoto } from "@/components/business/rotatable-photo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PhotoCarouselItem = {
  id: string;
  label: string;
  previewUrl: string;
  section?: string;
  thumbnailUrl: string;
};

type PhotoCarouselProps = {
  currentIndex: number;
  items: PhotoCarouselItem[];
  onClose: () => void;
  onIndexChange: (index: number) => void;
  title?: string;
};

export function PhotoCarousel({
  currentIndex,
  items,
  onClose,
  onIndexChange,
  title,
}: PhotoCarouselProps) {
  const current = items[currentIndex];
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  const changePhoto = useCallback(
    (index: number) => {
      setRotation(0);
      setZoom(1);
      onIndexChange(index);
    },
    [onIndexChange],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (items.length > 0 && event.key === "ArrowLeft") {
        changePhoto(currentIndex === 0 ? items.length - 1 : currentIndex - 1);
      }
      if (items.length > 0 && event.key === "ArrowRight") {
        changePhoto((currentIndex + 1) % items.length);
      }
      if (items.length > 0 && event.key.toLowerCase() === "r") {
        setRotation((currentRotation) => (currentRotation + 90) % 360);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [changePhoto, currentIndex, items.length, onClose]);

  if (!current || typeof document === "undefined") return null;

  const headerTitle = title ?? current.label;
  const headerDetails = [
    title ? current.label : current.section,
    `${currentIndex + 1}/${items.length}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return createPortal(
    <div
      aria-label="Visionneuse des photos"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 p-3 text-white sm:p-5"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">
            {headerTitle}
          </p>
          <p className="text-xs text-white/60">{headerDetails}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            aria-label={
              zoom === 3 ? "Réinitialiser le zoom" : "Agrandir la photo"
            }
            aria-pressed={zoom > 1}
            title={
              zoom === 3
                ? "Revenir à la vue complète"
                : "Zoomer pour inspecter les détails"
            }
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold",
              zoom > 1
                ? "bg-teal-600 hover:bg-teal-500"
                : "bg-white/10 hover:bg-white/20",
            )}
            type="button"
            onClick={() => setZoom((value) => (value === 3 ? 1 : value + 1))}
          >
            {zoom === 3 ? (
              <ZoomOut className="h-4 w-4" />
            ) : (
              <ZoomIn className="h-4 w-4" />
            )}
            <span aria-live="polite">×{zoom}</span>
          </button>
          <button
            aria-label="Faire pivoter la photo de 90 degrés"
            className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-3 text-xs font-semibold hover:bg-white/20 disabled:cursor-wait disabled:opacity-40"
            title="Faire pivoter (R)"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setRotation((currentRotation) => (currentRotation + 90) % 360);
            }}
          >
            <RotateCw className="h-4 w-4" />
            <span className="hidden sm:inline">Pivoter</span>
          </button>
          <button
            aria-label="Fermer la visionneuse"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="relative mx-auto my-3 flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <CurrentPhoto
          key={current.previewUrl}
          current={current}
          rotation={rotation}
          zoom={zoom}
          nextUrl={
            items.length > 1
              ? items[(currentIndex + 1) % items.length]?.previewUrl
              : undefined
          }
          previousUrl={
            items.length > 2
              ? items[(currentIndex + items.length - 1) % items.length]
                  ?.previewUrl
              : undefined
          }
        />
        {zoom > 1 && (
          <p className="pointer-events-none absolute bottom-2 z-10 rounded-full bg-black/60 px-3 py-1.5 text-center text-xs text-white/90">
            Faites glisser la photo pour explorer les détails
          </p>
        )}
        {items.length > 1 ? (
          <>
            <button
              aria-label="Photo précédente"
              className="absolute left-1 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 sm:left-3"
              type="button"
              onClick={() =>
                changePhoto(
                  currentIndex === 0 ? items.length - 1 : currentIndex - 1,
                )
              }
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              aria-label="Photo suivante"
              className="absolute right-1 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 sm:right-3"
              type="button"
              onClick={() => changePhoto((currentIndex + 1) % items.length)}
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
            key={item.id}
            type="button"
            onClick={() => changePhoto(index)}
          >
            <img
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              src={item.thumbnailUrl}
            />
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}

// The displayed image loads independently; a slow or failed neighbour never blocks it.
function CurrentPhoto({
  current,
  rotation,
  zoom,
  nextUrl,
  previousUrl,
}: {
  current: PhotoCarouselItem;
  rotation: number;
  zoom: number;
  nextUrl?: string;
  previousUrl?: string;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== "ready") return;
    // Only warm the two adjacent previews after the selected image is visible.
    const neighbours = [...new Set([nextUrl, previousUrl])]
      .filter((url): url is string => !!url && url !== current.previewUrl)
      .map((url) => {
        const image = new Image();
        image.fetchPriority = "low";
        image.src = url;
        return image;
      });
    return () => {
      neighbours.forEach((image) => image.removeAttribute("src"));
    };
  }, [status, nextUrl, previousUrl, current.previewUrl]);

  return (
    <>
      <RotatablePhoto
        key={attempt}
        alt={current.label}
        className="rounded-lg"
        rotation={rotation}
        zoom={zoom}
        src={current.previewUrl}
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
      />
      {status === "loading" && (
        <div
          role="status"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3"
        >
          <LoaderCircle className="h-8 w-8 animate-spin text-teal-400" />
          <p className="text-sm">Chargement de la photo…</p>
        </div>
      )}
      {status === "error" && (
        <div
          role="alert"
          className="relative z-10 mx-14 flex max-w-sm flex-col items-center gap-3 text-center"
        >
          <p>Cette photo n’a pas pu être chargée.</p>
          <p className="text-sm text-white/60">
            Vous pouvez réessayer ou consulter une autre photo.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}
          >
            Réessayer
          </Button>
        </div>
      )}
    </>
  );
}
