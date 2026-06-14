"use client";

import {
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  detectLicensePlateCountry,
  formatLicensePlate,
  normalizeLicensePlate,
} from "@/lib/license-plate";
import { businessService } from "@/services/business.service";

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

type CameraStatus = "starting" | "active" | "unavailable";
type CameraErrorReason = "INSECURE_CONTEXT" | "PERMISSION_DENIED" | "NOT_FOUND" | "UNAVAILABLE";

const automaticScanDelay = 900;

export function LicensePlateScanner({ country, onClose, onConfirm }: LicensePlateScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStartTimerRef = useRef<number | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const isScanningRef = useRef(false);
  const isMountedRef = useRef(true);
  const resultRef = useRef<ScanResult | null>(null);
  const stableCandidateRef = useRef<{ value: string; count: number } | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("starting");
  const [cameraErrorReason, setCameraErrorReason] = useState<CameraErrorReason | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopAutomaticScan = useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  }, []);

  const recognizeBlob = useCallback(
    async (image: Blob) => {
      if (isScanningRef.current || resultRef.current) return null;

      isScanningRef.current = true;
      setIsScanning(true);

      try {
        const recognition = await businessService.recognizeLicensePlate(image);
        if (!recognition.detected || !recognition.plate) {
          stableCandidateRef.current = null;
          return null;
        }

        const normalizedValue = normalizeLicensePlate(recognition.plate);
        if (normalizedValue.length < 4) {
          return null;
        }

        const previous = stableCandidateRef.current;
        const stableCount = previous?.value === normalizedValue ? previous.count + 1 : 1;
        stableCandidateRef.current = { value: normalizedValue, count: stableCount };
        const confidence = recognition.confidence ?? 0;

        if (confidence < 90 && stableCount < 2) {
          return null;
        }

        const detectedCountry =
          normalizeFastAlprRegion(recognition.region) ??
          detectLicensePlateCountry(normalizedValue, country);
        const detectedResult = {
          value: recognition.plate,
          country: detectedCountry,
          confidence,
        };

        resultRef.current = detectedResult;
        setResult(detectedResult);
        stopAutomaticScan();
        return detectedResult;
      } catch {
        return null;
      } finally {
        isScanningRef.current = false;
        if (isMountedRef.current) setIsScanning(false);
      }
    },
    [country, stopAutomaticScan],
  );

  const captureScanArea = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

    const sourceWidth = video.videoWidth * 0.94;
    const sourceHeight = Math.min(sourceWidth / 3.6, video.videoHeight * 0.38);
    const sourceX = (video.videoWidth - sourceWidth) / 2;
    const sourceY = (video.videoHeight - sourceHeight) / 2;
    const outputWidth = 1280;
    const outputHeight = Math.round(outputWidth / 3.6);
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  }, []);

  const scheduleAutomaticScan = useCallback(() => {
    stopAutomaticScan();

    const runScan = async () => {
      if (!isMountedRef.current || resultRef.current || cameraStatus !== "active") return;
      const image = await captureScanArea();
      if (image) await recognizeBlob(image);
      if (isMountedRef.current && !resultRef.current) {
        scanTimerRef.current = window.setTimeout(runScan, automaticScanDelay);
      }
    };

    scanTimerRef.current = window.setTimeout(runScan, 500);
  }, [cameraStatus, captureScanArea, recognizeBlob, stopAutomaticScan]);

  useEffect(() => {
    isMountedRef.current = true;

    async function startCamera() {
      if (!window.isSecureContext) {
        setCameraErrorReason("INSECURE_CONTEXT");
        setCameraStatus("unavailable");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraErrorReason("UNAVAILABLE");
        setCameraStatus("unavailable");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (!isMountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraStatus("active");
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          setCameraErrorReason("PERMISSION_DENIED");
        } else if (error instanceof DOMException && error.name === "NotFoundError") {
          setCameraErrorReason("NOT_FOUND");
        } else {
          setCameraErrorReason("UNAVAILABLE");
        }
        setCameraStatus("unavailable");
      }
    }

    // React Strict Mode replays effects in development. Deferring the request
    // prevents the discarded first pass from opening a second permission prompt.
    cameraStartTimerRef.current = window.setTimeout(() => {
      cameraStartTimerRef.current = null;
      void startCamera();
    }, 0);

    return () => {
      isMountedRef.current = false;
      if (cameraStartTimerRef.current !== null) {
        window.clearTimeout(cameraStartTimerRef.current);
        cameraStartTimerRef.current = null;
      }
      stopAutomaticScan();
      stopCamera();
    };
  }, [stopAutomaticScan, stopCamera]);

  useEffect(() => {
    if (cameraStatus === "active" && !result) scheduleAutomaticScan();
    return stopAutomaticScan;
  }, [cameraStatus, result, scheduleAutomaticScan, stopAutomaticScan]);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    restartDetection();
    const detected = await recognizeBlob(file);
    if (!detected) toast.error("Aucune plaque exploitable detectee sur cette image.");
    event.target.value = "";
  }

  function restartDetection() {
    resultRef.current = null;
    stableCandidateRef.current = null;
    setResult(null);
  }

  function closeScanner() {
    stopAutomaticScan();
    stopCamera();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/70 md:items-center md:justify-center">
      <div className="max-h-[100dvh] w-full overflow-y-auto rounded-t-lg bg-white shadow-xl md:max-h-[92dvh] md:max-w-lg md:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white p-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Scanner la plaque</h2>
            <p className="mt-1 text-sm text-gray-500">Place la plaque dans le cadre.</p>
          </div>
          <Button aria-label="Fermer" size="icon" type="button" variant="ghost" onClick={closeScanner}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-gray-950">
            <video autoPlay className="h-full w-full object-cover" muted playsInline ref={videoRef} />
            <canvas className="hidden" ref={canvasRef} />
            <div className="pointer-events-none absolute inset-0 bg-black/20" />
            <div
              className={[
                "pointer-events-none absolute left-[3%] top-1/2 aspect-[3.6/1] w-[94%] -translate-y-1/2 rounded-md border-2",
                result ? "border-emerald-400" : "border-white",
              ].join(" ")}
            >
              <span className="absolute -left-0.5 -top-0.5 h-5 w-5 border-l-4 border-t-4 border-teal-400" />
              <span className="absolute -right-0.5 -top-0.5 h-5 w-5 border-r-4 border-t-4 border-teal-400" />
              <span className="absolute -bottom-0.5 -left-0.5 h-5 w-5 border-b-4 border-l-4 border-teal-400" />
              <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 border-b-4 border-r-4 border-teal-400" />
            </div>

            {cameraStatus !== "active" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 p-6 text-center text-white">
                <div>
                  {cameraStatus === "starting" ? (
                    <LoaderCircle className="mx-auto h-8 w-8 animate-spin" />
                  ) : (
                    <Camera className="mx-auto h-8 w-8" />
                  )}
                  <p className="mt-3 text-sm font-medium">
                    {cameraStatus === "starting"
                      ? "Demarrage de la camera"
                      : cameraErrorMessage(cameraErrorReason)}
                  </p>
                </div>
              </div>
            ) : null}

            {cameraStatus === "active" && !result ? (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-xs text-white">
                {isScanning ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {stableCandidateRef.current?.count
                  ? "Plaque reperee, confirmation..."
                  : "Recherche FastALPR..."}
              </div>
            ) : null}
          </div>

          <input
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={inputRef}
            type="file"
            onChange={handlePhoto}
          />

          {result ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="h-5 w-5" />
                <p className="text-sm font-medium">Plaque detectee</p>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-950">
                {formatLicensePlate(normalizeLicensePlate(result.value), result.country, result.value)}
              </p>
              <div className="mt-3 flex justify-between text-sm text-gray-600">
                <span>Pays : {result.country === "UNKNOWN" ? "Inconnu" : result.country}</span>
                <span>Confiance : {result.confidence}%</span>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                Verifie les caracteres avant d'utiliser cette plaque.
              </p>
            </div>
          ) : null}

          {cameraStatus === "unavailable" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {cameraErrorHelp(cameraErrorReason)}
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-gray-200 bg-white p-4">
          <Button
            disabled={isScanning}
            type="button"
            variant="outline"
            onClick={result ? restartDetection : () => inputRef.current?.click()}
          >
            {result ? <RefreshCw className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
            {result ? "Recommencer" : "Choisir une photo"}
          </Button>
          <Button disabled={!result} type="button" onClick={() => result && onConfirm(result)}>
            <Check className="h-4 w-4" />
            Utiliser
          </Button>
        </div>
      </div>
    </div>
  );
}

function normalizeFastAlprRegion(region: string | null | undefined) {
  if (!region) return null;

  const normalized = region.trim().toUpperCase();
  const aliases: Record<string, string> = {
    FRA: "FR",
    FRANCE: "FR",
    BEL: "BE",
    BELGIUM: "BE",
    BELGIQUE: "BE",
    "CZECH REPUBLIC": "CZ",
    CZECHIA: "CZ",
    CZE: "CZ",
    DEU: "DE",
    GERMANY: "DE",
    ALLEMAGNE: "DE",
    ESP: "ES",
    SPAIN: "ES",
    ITA: "IT",
    ITALY: "IT",
    NLD: "NL",
    NETHERLANDS: "NL",
    "THE NETHERLANDS": "NL",
    PRT: "PT",
    PORTUGAL: "PT",
    POL: "PL",
    POLAND: "PL",
    AUT: "AT",
    AUSTRIA: "AT",
    DNK: "DK",
    DENMARK: "DK",
    SWE: "SE",
    SWEDEN: "SE",
    NOR: "NO",
    NORWAY: "NO",
    IRL: "IE",
    IRELAND: "IE",
    CHE: "CH",
    SWITZERLAND: "CH",
    GBR: "GB",
    UK: "GB",
  };

  if (/^[A-Z]{2}$/.test(normalized)) return normalized;
  return aliases[normalized] ?? null;
}

function cameraErrorMessage(reason: CameraErrorReason | null) {
  if (reason === "INSECURE_CONTEXT") return "La camera exige une connexion HTTPS";
  if (reason === "PERMISSION_DENIED") return "L'autorisation camera a ete refusee";
  if (reason === "NOT_FOUND") return "Aucune camera compatible n'a ete trouvee";
  return "La camera n'est pas disponible sur cet appareil";
}

function cameraErrorHelp(reason: CameraErrorReason | null) {
  if (reason === "INSECURE_CONTEXT") {
    return "Ouvre l'application avec une adresse HTTPS. Une adresse locale en http://192.168... ne peut pas demander la permission camera.";
  }
  if (reason === "PERMISSION_DENIED") {
    return "Autorise la camera dans les reglages du navigateur pour ce site, puis recharge la page.";
  }
  if (reason === "NOT_FOUND") {
    return "Verifie que l'appareil dispose d'une camera utilisable ou choisis une photo existante.";
  }
  return "Tu peux continuer en choisissant une photo depuis la phototheque.";
}
