"use client";

import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RotateCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RotatablePhoto } from "@/components/business/rotatable-photo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const imagePreloadTtlMs = 10 * 60 * 1000;
const maximumCachedPreloads = 200;
const completedImagePreloads = new Map<string, number>();
const pendingImagePreloads = new Map<string, Promise<void>>();

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

type PreloadState = {
  complete: boolean;
  failed: number;
  loaded: number;
  ready: boolean;
  total: number;
};

function isImagePreloaded(url: string) {
  const loadedAt = completedImagePreloads.get(url);
  if (loadedAt === undefined) return false;

  if (Date.now() - loadedAt > imagePreloadTtlMs) {
    completedImagePreloads.delete(url);
    return false;
  }

  return true;
}

function rememberImagePreload(url: string) {
  completedImagePreloads.delete(url);
  completedImagePreloads.set(url, Date.now());

  while (completedImagePreloads.size > maximumCachedPreloads) {
    const oldestUrl = completedImagePreloads.keys().next().value;
    if (oldestUrl === undefined) break;
    completedImagePreloads.delete(oldestUrl);
  }
}

function preloadImage(url: string) {
  if (isImagePreloaded(url)) return Promise.resolve();

  const pendingPreload = pendingImagePreloads.get(url);
  if (pendingPreload) return pendingPreload;

  const image = new Image();
  const preload = new Promise<void>((resolve, reject) => {
    image.onload = () => {
      if (typeof image.decode !== "function") {
        resolve();
        return;
      }

      void image.decode().then(resolve).catch(resolve);
    };
    image.onerror = () => reject(new Error(`Unable to preload image: ${url}`));
    image.src = url;
  })
    .then(() => {
      rememberImagePreload(url);
    })
    .finally(() => {
      pendingImagePreloads.delete(url);
    });

  pendingImagePreloads.set(url, preload);
  return preload;
}

function initialPreloadState(urls: string[]): PreloadState {
  const loaded = urls.filter(isImagePreloaded).length;
  const ready = loaded === urls.length;

  return {
    complete: ready,
    failed: 0,
    loaded,
    ready,
    total: urls.length,
  };
}

export function PhotoCarousel({
  currentIndex,
  items,
  onClose,
  onIndexChange,
  title,
}: PhotoCarouselProps) {
  const current = items[currentIndex];
  const previewUrls = useMemo(
    () => items.map((item) => item.previewUrl),
    [items],
  );
  const [preloadAttempt, setPreloadAttempt] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [preloadState, setPreloadState] = useState<PreloadState>(() =>
    initialPreloadState(previewUrls),
  );

  useEffect(() => {
    let cancelled = false;
    const missingUrls = previewUrls.filter((url) => !isImagePreloaded(url));
    let completed = previewUrls.length - missingUrls.length;
    let failed = 0;

    queueMicrotask(() => {
      if (cancelled) return;
      setPreloadState({
        complete: completed === previewUrls.length,
        failed: 0,
        loaded: completed,
        ready: completed === previewUrls.length,
        total: previewUrls.length,
      });
    });

    for (const url of missingUrls) {
      void preloadImage(url).then(
        () => {
          if (cancelled) return;
          completed += 1;
          setPreloadState({
            complete: completed === previewUrls.length,
            failed,
            loaded: completed - failed,
            ready: completed === previewUrls.length && failed === 0,
            total: previewUrls.length,
          });
        },
        () => {
          if (cancelled) return;
          completed += 1;
          failed += 1;
          setPreloadState({
            complete: completed === previewUrls.length,
            failed,
            loaded: completed - failed,
            ready: false,
            total: previewUrls.length,
          });
        },
      );
    }

    return () => {
      cancelled = true;
    };
  }, [preloadAttempt, previewUrls]);

  const changePhoto = useCallback(
    (index: number) => {
      setRotation(0);
      onIndexChange(index);
    },
    [onIndexChange],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (preloadState.ready && event.key === "ArrowLeft") {
        changePhoto(currentIndex === 0 ? items.length - 1 : currentIndex - 1);
      }
      if (preloadState.ready && event.key === "ArrowRight") {
        changePhoto((currentIndex + 1) % items.length);
      }
      if (preloadState.ready && event.key.toLowerCase() === "r") {
        setRotation((currentRotation) => (currentRotation + 90) % 360);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [changePhoto, currentIndex, items.length, onClose, preloadState.ready]);

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
            {preloadState.ready ? headerTitle : "Chargement du carrousel"}
          </p>
          <p className="text-xs text-white/60">
            {preloadState.ready
              ? headerDetails
              : `${preloadState.loaded}/${preloadState.total} photos chargées`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            aria-label="Faire pivoter la photo de 90 degrés"
            className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-3 text-xs font-semibold hover:bg-white/20 disabled:cursor-wait disabled:opacity-40"
            disabled={!preloadState.ready}
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
                {preloadState.loaded + preloadState.failed}/
                {preloadState.total}
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
            className="relative mx-auto my-3 flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <RotatablePhoto
              alt={current.label}
              className="rounded-lg"
              key={current.id}
              rotation={rotation}
              src={current.previewUrl}
            />
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
                  src={item.thumbnailUrl}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
