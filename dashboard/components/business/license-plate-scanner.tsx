"use client";

import { Camera, Check, ImagePlus, LoaderCircle, RotateCcw, X } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  detectLicensePlateCountry,
  extractLicensePlateCandidate,
  formatLicensePlate,
  normalizeLicensePlate,
} from "@/lib/license-plate";

type ScanResult = {
  value: string;
  country: string;
  confidence: number;
};

type LicensePlateScannerProps = {
  country: string;
  onClose: () => void;
  onConfirm: (result: ScanResult) => void;
};

export function LicensePlateScanner({ country, onClose, onConfirm }: LicensePlateScannerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setProgress(0);

    try {
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("eng", undefined, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setProgress(Math.round(message.progress * 100));
          }
        },
      });

      try {
        await worker.setParameters({
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ",
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        });
        const recognition = await worker.recognize(file);
        const candidate = extractLicensePlateCandidate(recognition.data.text, country);

        if (!candidate) {
          toast.error("Aucune plaque exploitable detectee. Reprends la photo ou saisis-la manuellement.");
          return;
        }

        const detectedCountry = detectLicensePlateCountry(candidate.normalized, country);
        setResult({
          value: candidate.raw || candidate.normalized,
          country: detectedCountry,
          confidence: Math.max(0, Math.min(100, Math.round(recognition.data.confidence))),
        });
      } finally {
        await worker.terminate();
      }
    } catch {
      toast.error("Impossible d'analyser cette photo sur cet appareil.");
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/55 md:items-center md:justify-center">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white shadow-xl md:max-w-lg md:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white p-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Scanner la plaque</h2>
            <p className="mt-1 text-sm text-gray-500">La photo est analysee localement sur cet appareil.</p>
          </div>
          <Button aria-label="Fermer" size="icon" type="button" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-gray-950 px-8">
            <div className="flex aspect-[4/1] w-full items-center justify-center rounded-md border-2 border-dashed border-white/80">
              <div className="text-center text-white">
                <Camera className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm">Cadre la plaque au centre de la photo</p>
              </div>
            </div>
          </div>

          <input
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={inputRef}
            type="file"
            onChange={handlePhoto}
          />

          {isProcessing ? (
            <div className="rounded-md border border-teal-200 bg-teal-50 p-4">
              <div className="flex items-center gap-3">
                <LoaderCircle className="h-5 w-5 animate-spin text-teal-700" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-teal-900">Analyse en cours</span>
                    <span className="text-teal-700">{progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-teal-100">
                    <div className="h-full bg-teal-700 transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-md border border-gray-200 p-4">
              <p className="text-xs font-medium uppercase text-gray-500">Plaque proposee</p>
              <p className="mt-2 text-2xl font-semibold text-gray-950">
                {formatLicensePlate(normalizeLicensePlate(result.value), result.country, result.value)}
              </p>
              <div className="mt-3 flex justify-between text-sm text-gray-600">
                <span>Pays : {result.country === "UNKNOWN" ? "Inconnu" : result.country}</span>
                <span>Confiance OCR : {result.confidence}%</span>
              </div>
              {result.confidence < 70 ? (
                <p className="mt-3 text-sm text-amber-700">
                  Resultat incertain : verifie attentivement chaque caractere avant de confirmer.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-gray-200 bg-white p-4">
          <Button
            disabled={isProcessing}
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            {result ? <RotateCcw className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
            {result ? "Reprendre" : "Prendre une photo"}
          </Button>
          <Button
            disabled={!result || isProcessing}
            type="button"
            onClick={() => result && onConfirm(result)}
          >
            <Check className="h-4 w-4" />
            Utiliser
          </Button>
        </div>
      </div>
    </div>
  );
}
