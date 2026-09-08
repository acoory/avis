"use client";

import { useEffect, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  commercialApiUrl,
  downloadCommercialArchive,
} from "@/lib/risk-commercial";
import { PublicCommercialGallery } from "@/types/risk";
import { CommercialGallery } from "./commercial-gallery";

export function PublicCommercialPage({ token }: { token: string }) {
  const [gallery, setGallery] = useState<PublicCommercialGallery | null>(null);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(commercialApiUrl(token), {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setGallery(await response.json());
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [token]);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 text-sm font-semibold tracking-wide text-teal-800">
          READYLINE · PHOTOS COMMERCIALES
        </p>
        {error ? (
          <div className="rounded-2xl border bg-white p-8">
            <h1 className="text-xl font-semibold">Galerie indisponible</h1>
            <p className="mt-2 text-slate-500">
              Vérifiez le lien reçu ou réessayez plus tard.
            </p>
          </div>
        ) : !gallery ? (
          <p role="status" className="flex items-center gap-2">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Chargement des photos…
          </p>
        ) : (
          <>
            <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-slate-950">
                  {gallery.manufacturer} · {gallery.licensePlate}
                </h1>
                <p className="mt-2 text-slate-600">
                  {gallery.mileage.toLocaleString("fr-FR")} km ·{" "}
                  {gallery.photos.length} photos
                </p>
              </div>
              <Button
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true);
                  try {
                    await downloadCommercialArchive(token);
                  } catch {
                    toast.error("Le téléchargement a échoué. Réessayez.");
                  } finally {
                    setDownloading(false);
                  }
                }}
              >
                <Download className="h-4 w-4" />
                {downloading
                  ? "Téléchargement…"
                  : "Télécharger toutes les photos"}
              </Button>
            </header>
            <CommercialGallery photos={gallery.photos} />
          </>
        )}
      </div>
    </main>
  );
}
