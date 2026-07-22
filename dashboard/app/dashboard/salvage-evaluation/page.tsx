"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Mail,
  Pencil,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { salvageEvaluationService } from "@/services/salvage-evaluation.service";
import {
  SalvageEvaluationPayload,
  SalvageEvaluationSendResult,
  SalvagePurchaseChannel,
} from "@/types/salvage-evaluation";

const EMAIL_STORAGE_KEY = "salvageEvaluationRecipientEmail";
const DRAFT_STORAGE_KEY = "salvageEvaluationDraft";

const PROGRESS_FIELDS = [
  "make",
  "model",
  "mva",
  "licenseNumber",
  "purchaseType",
  "kilometers",
  "registrationDate",
  "returnDate",
  "estimatedRepairDays",
  "recipientEmail",
] as const satisfies ReadonlyArray<keyof FormValues>;

type FormValues = {
  estimatedRepairDays: string;
  kilometers: string;
  licenseNumber: string;
  make: string;
  model: string;
  mva: string;
  purchaseChannel: SalvagePurchaseChannel;
  purchaseType: string;
  recipientEmail: string;
  registrationDate: string;
  returnDate: string;
};

const emptyForm: FormValues = {
  estimatedRepairDays: "",
  kilometers: "",
  licenseNumber: "",
  make: "",
  model: "",
  mva: "",
  purchaseChannel: "Risk",
  purchaseType: "",
  recipientEmail: "",
  registrationDate: "",
  returnDate: "",
};

export default function SalvageEvaluationPage() {
  const [values, setValues] = useState<FormValues>(() => loadInitialValues());
  const [draftRestored] = useState(() =>
    typeof window === "undefined"
      ? false
      : Boolean(window.localStorage.getItem(DRAFT_STORAGE_KEY)),
  );
  const [focusedField, setFocusedField] = useState<keyof FormValues | null>(
    null,
  );
  const [step, setStep] = useState<"form" | "review" | "sent">("form");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] =
    useState<SalvageEvaluationSendResult | null>(null);

  const payload = useMemo(() => toPayload(values), [values]);
  const dateError =
    Boolean(values.registrationDate) &&
    Boolean(values.returnDate) &&
    values.returnDate < values.registrationDate;
  const immobilizationDays = daysBetween(
    values.registrationDate,
    values.returnDate,
  );
  const completedCount = PROGRESS_FIELDS.filter((field) =>
    Boolean(values[field]?.toString().trim()),
  ).length;

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (key === "recipientEmail") {
      window.localStorage.setItem(EMAIL_STORAGE_KEY, String(value).trim());
    }
  }

  function focusProps<K extends keyof FormValues>(field: K) {
    return {
      onFocus: () => setFocusedField(field),
      onBlur: () =>
        setFocusedField((current) => (current === field ? null : current)),
    };
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dateError) {
      toast.error(
        "La date de restitution doit être postérieure à la date d’immatriculation.",
      );
      return;
    }
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function downloadPreview() {
    setIsDownloading(true);
    try {
      const blob = await salvageEvaluationService.preview(payload);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName(values.licenseNumber);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("L’aperçu Excel a été téléchargé.");
    } catch {
      toast.error("Impossible de générer l’aperçu Excel.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function sendEmail() {
    setIsSending(true);
    try {
      const result = await salvageEvaluationService.send(payload);
      setSendResult(result);
      setStep("sent");
      toast.success(`Le document a été envoyé à ${result.recipientEmail}.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error(
        "L’envoi a échoué. Vérifiez l’adresse et la configuration e-mail.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function restart() {
    const recipientEmail = values.recipientEmail;
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setValues({ ...emptyForm, recipientEmail });
    setSendResult(null);
    setStep("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Salvage Evaluation"
        description="Complétez les informations autorisées, vérifiez le document puis envoyez-le par e-mail. Les coûts du fichier restent inchangés."
      />

      <WorkflowSteps step={step} />

      {draftRestored && step === "form" ? (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50/60 px-4 py-2.5 text-sm text-teal-900">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-teal-700" />
            Brouillon restauré automatiquement depuis votre dernière visite.
          </span>
          <button
            className="flex items-center gap-1 text-xs font-semibold text-teal-700 underline-offset-2 hover:underline"
            onClick={restart}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
            Effacer
          </button>
        </div>
      ) : null}

      {step === "form" ? (
        <div className="mb-6 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-teal-600 transition-[width] duration-300"
              style={{
                width: `${(completedCount / PROGRESS_FIELDS.length) * 100}%`,
              }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium text-gray-500">
            {completedCount}/{PROGRESS_FIELDS.length} champs complétés
          </span>
        </div>
      ) : null}

      {step === "form" ? (
        <form onSubmit={handleReview}>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informations du véhicule</CardTitle>
                  <CardDescription>
                    Ces informations alimentent les premières cellules orange du fichier.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 sm:grid-cols-2">
                  <Field label="Marque" required>
                    <Input
                      required
                      autoComplete="organization"
                      maxLength={80}
                      placeholder="RENAULT"
                      value={values.make}
                      onChange={(event) => update("make", event.target.value)}
                      {...focusProps("make")}
                    />
                  </Field>
                  <Field label="Modèle" required>
                    <Input
                      required
                      maxLength={80}
                      placeholder="CLIO"
                      value={values.model}
                      onChange={(event) => update("model", event.target.value)}
                      {...focusProps("model")}
                    />
                  </Field>
                  <Field label="MVA" required>
                    <Input
                      required
                      inputMode="numeric"
                      maxLength={40}
                      placeholder="12839724"
                      value={values.mva}
                      onChange={(event) => update("mva", event.target.value)}
                      {...focusProps("mva")}
                    />
                  </Field>
                  <Field label="Immatriculation" required>
                    <Input
                      required
                      maxLength={30}
                      placeholder="HJ-315-RK"
                      value={values.licenseNumber}
                      onChange={(event) =>
                        update("licenseNumber", event.target.value)
                      }
                      {...focusProps("licenseNumber")}
                    />
                  </Field>
                  <Field
                    label="Purchase Type / VIN"
                    hint="Libellé conservé tel qu’il apparaît dans le modèle."
                    required
                  >
                    <Input
                      required
                      maxLength={80}
                      placeholder="VF1RJA00876532435"
                      value={values.purchaseType}
                      onChange={(event) =>
                        update("purchaseType", event.target.value)
                      }
                      {...focusProps("purchaseType")}
                    />
                  </Field>
                  <Field label="Canal d’achat" required>
                    <select
                      required
                      className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700"
                      value={values.purchaseChannel}
                      onChange={(event) =>
                        update(
                          "purchaseChannel",
                          event.target.value as SalvagePurchaseChannel,
                        )
                      }
                      {...focusProps("purchaseChannel")}
                    >
                      <option value="Risk">Risk</option>
                      <option value="BB">Buy Back (BB)</option>
                    </select>
                  </Field>
                  <Field label="Kilométrage" required>
                    <Input
                      required
                      min="0"
                      step="1"
                      type="number"
                      placeholder="6219"
                      value={values.kilometers}
                      onChange={(event) =>
                        update("kilometers", event.target.value)
                      }
                      {...focusProps("kilometers")}
                    />
                  </Field>
                  <Field label="Date d’immatriculation" required>
                    <Input
                      required
                      type="date"
                      value={values.registrationDate}
                      onChange={(event) =>
                        update("registrationDate", event.target.value)
                      }
                      {...focusProps("registrationDate")}
                    />
                  </Field>
                  <Field
                    hint={
                      !dateError && immobilizationDays !== null && immobilizationDays >= 0
                        ? `Durée d’immobilisation : ${immobilizationDays} jour(s).`
                        : undefined
                    }
                    label="Date de restitution BB / RISK"
                    error={
                      dateError
                        ? "Doit être postérieure à la date d’immatriculation."
                        : undefined
                    }
                    required
                  >
                    <Input
                      required
                      aria-invalid={dateError}
                      className={cn(dateError && "border-red-400 focus:border-red-500")}
                      min={values.registrationDate || undefined}
                      type="date"
                      value={values.returnDate}
                      onChange={(event) =>
                        update("returnDate", event.target.value)
                      }
                      {...focusProps("returnDate")}
                    />
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Délai de réparation</CardTitle>
                  <CardDescription>
                    Les coûts de réparation et de transport du fichier ne sont pas modifiés.
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-w-sm">
                  <Field label="Jours de réparation estimés" required>
                    <Input
                      required
                      min="0"
                      step="1"
                      type="number"
                      placeholder="30"
                      value={values.estimatedRepairDays}
                      onChange={(event) =>
                        update("estimatedRepairDays", event.target.value)
                      }
                      {...focusProps("estimatedRepairDays")}
                    />
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Destinataire</CardTitle>
                  <CardDescription>
                    L’adresse est enregistrée dans ce navigateur et sera proposée à votre prochaine visite.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Field label="Adresse e-mail" required>
                    <div className="relative max-w-xl">
                      <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        required
                        className="pl-9"
                        maxLength={180}
                        placeholder="remarketing@entreprise.fr"
                        type="email"
                        value={values.recipientEmail}
                        onChange={(event) =>
                          update("recipientEmail", event.target.value)
                        }
                        {...focusProps("recipientEmail")}
                      />
                    </div>
                  </Field>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button disabled={dateError} type="submit">
                  Vérifier avant envoi
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-6 xl:sticky xl:top-22">
              <DocumentPreview compact focusedField={focusedField} values={values} />
            </div>
          </div>
        </form>
      ) : null}

      {step === "review" ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Récapitulatif avant envoi</CardTitle>
                <CardDescription>
                  Vérifiez les informations et le destinataire. Les coûts B13 et B14 resteront inchangés.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Summary values={values} />
              </CardContent>
            </Card>

            <Card className="border-teal-200 bg-teal-50/40">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-teal-100 p-2 text-teal-700">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-950">
                      Destinataire
                    </p>
                    <p className="text-sm text-gray-600">
                      {values.recipientEmail}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Pièce jointe : {fileName(values.licenseNumber)}
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("form")}
              >
                <ArrowLeft className="h-4 w-4" />
                Modifier
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDownloading || isSending}
                  onClick={downloadPreview}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Télécharger l’aperçu Excel
                </Button>
                <Button
                  type="button"
                  disabled={isSending || isDownloading}
                  onClick={sendEmail}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Envoyer par e-mail
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:sticky xl:top-22">
            <DocumentPreview values={values} />
          </div>
        </div>
      ) : null}

      {step === "sent" && sendResult ? (
        <Card className="mx-auto max-w-2xl overflow-hidden border-emerald-200">
          <div className="bg-emerald-50 px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-950">
              Document envoyé
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Le fichier <strong>{sendResult.filename}</strong> a été envoyé à{" "}
              <strong>{sendResult.recipientEmail}</strong>.
            </p>
          </div>
          <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:justify-center">
            <Button type="button" variant="outline" onClick={downloadPreview}>
              <Download className="h-4 w-4" />
              Télécharger une copie
            </Button>
            <Button type="button" onClick={restart}>
              <FileSpreadsheet className="h-4 w-4" />
              Nouvelle évaluation
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function WorkflowSteps({ step }: { step: "form" | "review" | "sent" }) {
  const activeIndex = step === "form" ? 0 : step === "review" ? 1 : 2;
  const steps = ["Informations", "Vérification", "Envoi"];

  return (
    <div className="mb-6 flex max-w-2xl items-center">
      {steps.map((label, index) => (
        <div className="contents" key={label}>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold",
                index < activeIndex &&
                  "border-teal-700 bg-teal-700 text-white",
                index === activeIndex &&
                  "border-teal-700 bg-teal-50 text-teal-800",
                index > activeIndex &&
                  "border-gray-200 bg-white text-gray-400",
              )}
            >
              {index < activeIndex ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "hidden text-xs font-semibold sm:inline",
                index <= activeIndex ? "text-gray-800" : "text-gray-400",
              )}
            >
              {label}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <div
              className={cn(
                "mx-3 h-px flex-1",
                index < activeIndex ? "bg-teal-700" : "bg-gray-200",
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Field({
  children,
  error,
  hint,
  label,
  required,
}: {
  children: React.ReactNode;
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

function DocumentPreview({
  compact = false,
  focusedField = null,
  values,
}: {
  compact?: boolean;
  focusedField?: keyof FormValues | null;
  values: FormValues;
}) {
  const rows = previewRows(values);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Aperçu du document</CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Se met à jour en temps réel — cellules orange uniquement
            </CardDescription>
          </div>
          <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="overflow-hidden rounded border border-gray-300 bg-white shadow-sm">
          <div className="border-b border-gray-300 bg-white px-3 py-2 text-base font-bold text-gray-950">
            Salvage Evaluation
          </div>
          <div className="grid grid-cols-[1.2fr_1fr] text-[11px]">
            {rows.map(({ field, label, value }) => (
              <div className="contents" key={label}>
                <div
                  className={cn(
                    "flex min-h-7 items-center border-b border-r border-gray-300 px-2 text-gray-700 transition-colors",
                    field && field === focusedField && "bg-teal-50 font-semibold text-teal-800",
                  )}
                >
                  {label}
                </div>
                <div
                  className={cn(
                    "flex min-h-7 items-center justify-center border-b border-gray-700 bg-[#ffc000] px-2 text-center font-bold text-gray-950 transition-shadow",
                    field && field === focusedField && "ring-2 ring-inset ring-teal-600",
                  )}
                >
                  {value || <span className="text-amber-800/40">À remplir</span>}
                </div>
              </div>
            ))}
          </div>
          {!compact ? (
            <div className="p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="h-7 rounded-sm bg-gray-500 text-center text-[10px] font-bold leading-7 text-white">
                  Buyback vehicle
                </div>
                <div className="h-7 rounded-sm bg-gray-500 text-center text-[10px] font-bold leading-7 text-white">
                  Risk Vehicle
                </div>
              </div>
              <div className="mt-2 space-y-1.5">
                {[85, 65, 92, 72, 88].map((width) => (
                  <div className="flex gap-2" key={width}>
                    <div className="h-2.5 flex-1 rounded bg-gray-100" />
                    <div
                      className="h-2.5 rounded bg-gray-200"
                      style={{ width: `${width}px` }}
                    />
                    <div className="h-2.5 w-20 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-gray-500">
          <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          Les coûts, les zones bleues, les formules et la mise en page ne sont pas modifiés.
        </p>
      </CardContent>
    </Card>
  );
}

function Summary({ values }: { values: FormValues }) {
  const rows = [
    ["Véhicule", `${values.make} ${values.model}`.trim()],
    ["MVA", values.mva],
    ["Immatriculation", values.licenseNumber],
    ["Purchase Type / VIN", values.purchaseType],
    ["Canal d’achat", values.purchaseChannel],
    ["Kilométrage", `${numberLabel(values.kilometers)} km`],
    ["Immatriculation initiale", dateLabel(values.registrationDate)],
    ["Restitution BB / RISK", dateLabel(values.returnDate)],
    ["Durée estimée", `${values.estimatedRepairDays} jour(s)`],
  ];

  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div className="border-b border-gray-100 pb-3" key={label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {label}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

type PreviewRow = { field: keyof FormValues | null; label: string; value: string };

function previewRows(values: FormValues): PreviewRow[] {
  return [
    { field: "make", label: "Make", value: values.make.toUpperCase() },
    { field: "model", label: "Model", value: values.model.toUpperCase() },
    { field: "mva", label: "MVA", value: values.mva },
    { field: "licenseNumber", label: "License No.", value: values.licenseNumber.toUpperCase() },
    { field: "purchaseType", label: "Purchase Type", value: values.purchaseType.toUpperCase() },
    { field: "purchaseChannel", label: "Purchase Channel (RISK/BB)", value: values.purchaseChannel },
    { field: "kilometers", label: "KM", value: values.kilometers },
    { field: "registrationDate", label: "Date d’immatriculation", value: templateDate(values.registrationDate) },
    { field: "returnDate", label: "Date de restitution BB/ RISK", value: templateDate(values.returnDate) },
    { field: null, label: "Repair Cost", value: "Valeur conservée" },
    { field: null, label: "Transport cost", value: "Valeur conservée" },
    { field: "estimatedRepairDays", label: "Nombre jours réparations estimé", value: decimalLabel(values.estimatedRepairDays) },
  ];
}

function daysBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  return Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
}

function loadInitialValues(): FormValues {
  if (typeof window === "undefined") return emptyForm;
  const email = window.localStorage.getItem(EMAIL_STORAGE_KEY) ?? "";
  const draftRaw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  if (draftRaw) {
    try {
      const draft = JSON.parse(draftRaw) as Partial<FormValues>;
      return {
        ...emptyForm,
        ...draft,
        recipientEmail: draft.recipientEmail || email,
      };
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }
  return { ...emptyForm, recipientEmail: email };
}

function toPayload(values: FormValues): SalvageEvaluationPayload {
  return {
    estimatedRepairDays: Number(values.estimatedRepairDays),
    kilometers: Number(values.kilometers),
    licenseNumber: values.licenseNumber.trim(),
    make: values.make.trim(),
    model: values.model.trim(),
    mva: values.mva.trim(),
    purchaseChannel: values.purchaseChannel,
    purchaseType: values.purchaseType.trim(),
    recipientEmail: values.recipientEmail.trim(),
    registrationDate: values.registrationDate,
    returnDate: values.returnDate,
  };
}

function fileName(licenseNumber: string) {
  const safeLicense = licenseNumber
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-");
  return `Salvage-Evaluation-${safeLicense || "vehicule"}.xlsx`;
}

function templateDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return `${day}${months[Number(month) - 1]}${year.slice(-2)}`;
}

function dateLabel(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function decimalLabel(value: string) {
  if (!value) return "";
  return Number(value).toFixed(2);
}

function numberLabel(value: string) {
  return value ? Number(value).toLocaleString("fr-FR") : "0";
}
