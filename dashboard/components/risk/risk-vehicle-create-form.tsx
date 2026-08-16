"use client";

import {
  Camera,
  CarFront,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RotateCcw,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LicensePlateScanner } from "@/components/business/license-plate-scanner";
import { ManagerMultiSelect } from "@/components/business/manager-multi-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  licensePlateCountries,
  sanitizeLicensePlateInput,
} from "@/lib/license-plate";
import { cn } from "@/lib/utils";
import { businessService } from "@/services/business.service";
import { riskService } from "@/services/risk.service";
import { useAuthStore } from "@/stores/auth.store";
import { Agency, Manufacturer } from "@/types/business";
import { RiskAssignee } from "@/types/risk";

type FormStep = "vehicle" | "assignment";

type RiskCreatePreferences = {
  agencyId: string;
  assigneeIds: string[];
  licensePlateCountry: string;
  manufacturerId: string;
  primaryAssigneeId: string;
};

const preferencesStoragePrefix = "risk-create-preferences";

export function RiskVehicleCreateForm() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.user?.id);
  const [activeStep, setActiveStep] = useState<FormStep>("vehicle");
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [assignees, setAssignees] = useState<RiskAssignee[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [licensePlateCountry, setLicensePlateCountry] = useState("FR");
  const [recognitionConfidence, setRecognitionConfidence] = useState<number>();
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [primaryAssigneeId, setPrimaryAssigneeId] = useState("");
  const [rememberPreferences, setRememberPreferences] = useState(true);
  const [hasStoredPreferences, setHasStoredPreferences] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    void Promise.all([
      businessService.agencies(),
      businessService.manufacturers(),
      riskService.assignees(),
    ])
      .then(([agencyData, manufacturerData, assigneeData]) => {
        if (!isCurrent) return;

        const preferences = readPreferences(userId);
        const availableAssigneeIds = new Set(
          assigneeData.map((assignee) => assignee.id),
        );
        const preferredAssigneeIds =
          preferences?.assigneeIds.filter((id) =>
            availableAssigneeIds.has(id),
          ) ?? [];
        const nextAssigneeIds = preferredAssigneeIds.length
          ? preferredAssigneeIds
          : assigneeData[0]
            ? [assigneeData[0].id]
            : [];
        const nextPrimaryAssigneeId =
          preferences?.primaryAssigneeId &&
          nextAssigneeIds.includes(preferences.primaryAssigneeId)
            ? preferences.primaryAssigneeId
            : (nextAssigneeIds[0] ?? "");

        setAgencies(agencyData);
        setManufacturers(manufacturerData);
        setAssignees(assigneeData);
        setAgencyId(
          agencyData.some((agency) => agency.id === preferences?.agencyId)
            ? (preferences?.agencyId ?? "")
            : (agencyData[0]?.id ?? ""),
        );
        setManufacturerId(
          manufacturerData.some(
            (manufacturer) => manufacturer.id === preferences?.manufacturerId,
          )
            ? (preferences?.manufacturerId ?? "")
            : (manufacturerData[0]?.id ?? ""),
        );
        setLicensePlateCountry(
          licensePlateCountries.some(
            (country) => country.code === preferences?.licensePlateCountry,
          )
            ? (preferences?.licensePlateCountry ?? "FR")
            : "FR",
        );
        setAssigneeIds(nextAssigneeIds);
        setPrimaryAssigneeId(nextPrimaryAssigneeId);
        setHasStoredPreferences(Boolean(preferences));
      })
      .catch(() => {
        if (isCurrent) setLoadError(true);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [loadAttempt, userId]);

  const selectedAssignees = useMemo(
    () => assignees.filter((assignee) => assigneeIds.includes(assignee.id)),
    [assigneeIds, assignees],
  );
  const selectedAgency = agencies.find((agency) => agency.id === agencyId);
  const selectedManufacturer = manufacturers.find(
    (manufacturer) => manufacturer.id === manufacturerId,
  );
  const primaryAssignee = assignees.find(
    (assignee) => assignee.id === primaryAssigneeId,
  );
  const vehicleStepReady = Boolean(licensePlate && agencyId && manufacturerId);

  function changeAssignees(ids: string[]) {
    setAssigneeIds(ids);
    if (!ids.includes(primaryAssigneeId)) setPrimaryAssigneeId(ids[0] ?? "");
  }

  function goToAssignment() {
    if (!vehicleStepReady) {
      toast.error("Renseigne la plaque, l'agence et le constructeur.");
      return;
    }
    setActiveStep("assignment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetPreferences() {
    removePreferences(userId);
    const defaultAssigneeIds = assignees[0] ? [assignees[0].id] : [];
    setAgencyId(agencies[0]?.id ?? "");
    setManufacturerId(manufacturers[0]?.id ?? "");
    setLicensePlateCountry("FR");
    setAssigneeIds(defaultAssigneeIds);
    setPrimaryAssigneeId(defaultAssigneeIds[0] ?? "");
    setHasStoredPreferences(false);
    toast.success("Préférences réinitialisées.");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (activeStep === "vehicle") {
      goToAssignment();
      return;
    }
    if (!vehicleStepReady) {
      setActiveStep("vehicle");
      toast.error("Renseigne la plaque, l'agence et le constructeur.");
      return;
    }
    if (!assigneeIds.length || !primaryAssigneeId) {
      toast.error("Assigne au moins un responsable au dossier.");
      return;
    }

    setIsSaving(true);
    try {
      const vehicle = await riskService.create({
        agencyId,
        assigneeIds,
        licensePlate,
        licensePlateCountry,
        licensePlateRecognitionConfidence: recognitionConfidence,
        manufacturerId,
        primaryAssigneeId,
      });

      if (rememberPreferences) {
        writePreferences(userId, {
          agencyId,
          assigneeIds,
          licensePlateCountry,
          manufacturerId,
          primaryAssigneeId,
        });
      }

      toast.success("Brouillon Risk créé. Vous pouvez prendre les photos.");
      router.replace(`/dashboard/risk/${vehicle.id}`);
    } catch {
      toast.error(
        "Impossible de créer le dossier Risk. Vérifie qu'il n'existe pas déjà.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-20 md:pb-0">
      <div>
        <h1 className="text-xl font-semibold text-gray-950 sm:text-2xl">
          Nouveau dossier Risk
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Identifiez le véhicule, puis choisissez les personnes chargées de
          l’analyse.
        </p>
      </div>

      <div aria-label="Étapes de création" className="grid grid-cols-2 gap-2">
        <StepButton
          active={activeStep === "vehicle"}
          icon={<CarFront className="h-4 w-4" />}
          label="Véhicule"
          summary={licensePlate || "Plaque et informations"}
          onClick={() => setActiveStep("vehicle")}
        />
        <StepButton
          active={activeStep === "assignment"}
          icon={<UsersRound className="h-4 w-4" />}
          label="Attribution"
          summary={
            primaryAssignee
              ? `${primaryAssignee.firstName} ${primaryAssignee.lastName}`
              : "Responsable à choisir"
          }
          onClick={() => setActiveStep("assignment")}
        />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex min-h-64 items-center justify-center gap-2 p-6 text-sm text-gray-500">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Chargement du formulaire…
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card>
          <CardContent className="space-y-4 p-5 text-center">
            <p className="text-sm text-red-700">
              Impossible de charger les agences, constructeurs et responsables.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsLoading(true);
                setLoadError(false);
                setLoadAttempt((attempt) => attempt + 1);
              }}
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={submit}>
          {activeStep === "vehicle" ? (
            <Card>
              <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>Identification du véhicule</span>
                  <span className="text-xs font-medium text-gray-400">1/2</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0">
                <Button
                  className="h-12 w-full sm:col-span-2"
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                >
                  <Camera className="h-4 w-4" /> Scanner la plaque
                </Button>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Immatriculation</Label>
                  <div className="grid grid-cols-[5.5rem_1fr] gap-2">
                    <select
                      aria-label="Pays d'immatriculation"
                      className={selectClass}
                      value={licensePlateCountry}
                      onChange={(event) =>
                        setLicensePlateCountry(event.target.value)
                      }
                    >
                      {licensePlateCountries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.code === "UNKNOWN" ? "Autre" : country.code}
                        </option>
                      ))}
                    </select>
                    <Input
                      className="h-11 uppercase"
                      maxLength={20}
                      placeholder="AB-123-CD"
                      value={licensePlate}
                      onChange={(event) => {
                        setLicensePlate(
                          sanitizeLicensePlateInput(event.target.value),
                        );
                        setRecognitionConfidence(undefined);
                      }}
                    />
                  </div>
                </div>

                <Field label="Agence">
                  <select
                    className={selectClass}
                    value={agencyId}
                    onChange={(event) => setAgencyId(event.target.value)}
                  >
                    {agencies.map((agency) => (
                      <option key={agency.id} value={agency.id}>
                        {agency.name} · {agency.city}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Constructeur">
                  <select
                    className={selectClass}
                    value={manufacturerId}
                    onChange={(event) => setManufacturerId(event.target.value)}
                  >
                    {manufacturers.map((manufacturer) => (
                      <option key={manufacturer.id} value={manufacturer.id}>
                        {manufacturer.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>Personnes chargées de l’analyse</span>
                    <span className="text-xs font-medium text-gray-400">
                      2/2
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                  {assignees.length ? (
                    <>
                      <Field label="Personnes assignées">
                        <ManagerMultiSelect
                          managers={assignees}
                          placeholder="Choisir les personnes"
                          value={assigneeIds}
                          onChange={changeAssignees}
                        />
                      </Field>
                      <Field label="Responsable principal">
                        <select
                          className={selectClass}
                          value={primaryAssigneeId}
                          onChange={(event) =>
                            setPrimaryAssigneeId(event.target.value)
                          }
                        >
                          {selectedAssignees.map((assignee) => (
                            <option key={assignee.id} value={assignee.id}>
                              {assignee.firstName} {assignee.lastName}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <p className="text-xs leading-5 text-slate-500">
                        Le responsable principal est la personne autorisée à
                        clore le dossier.
                      </p>
                    </>
                  ) : (
                    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Aucun manager actif n’est disponible. Un administrateur
                      doit d’abord affecter un manager à votre compte.
                    </p>
                  )}

                  <div className="rounded-lg border border-teal-100 bg-teal-50/70 p-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        checked={rememberPreferences}
                        className="mt-0.5 h-4 w-4 accent-teal-700"
                        type="checkbox"
                        onChange={(event) =>
                          setRememberPreferences(event.target.checked)
                        }
                      />
                      <span>
                        <span className="block text-sm font-medium text-teal-950">
                          Mémoriser mes choix
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-teal-800">
                          L’agence, le constructeur et les personnes seront
                          préremplis au prochain dossier sur cet appareil.
                        </span>
                      </span>
                    </label>
                    {hasStoredPreferences ? (
                      <button
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
                        type="button"
                        onClick={resetPreferences}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser mes
                        préférences
                      </button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
                  <SummaryItem label="Plaque" value={licensePlate || "—"} />
                  <SummaryItem
                    label="Agence"
                    value={selectedAgency?.name ?? "—"}
                  />
                  <SummaryItem
                    label="Constructeur"
                    value={selectedManufacturer?.name ?? "—"}
                  />
                  <SummaryItem
                    label="Responsable"
                    value={
                      primaryAssignee
                        ? `${primaryAssignee.firstName} ${primaryAssignee.lastName}`
                        : "—"
                    }
                  />
                </CardContent>
              </Card>
            </div>
          )}

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:static md:mt-5 md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none">
            <div className="mx-auto flex max-w-3xl gap-2 [padding-bottom:max(0px,env(safe-area-inset-bottom))] md:justify-end">
              {activeStep === "vehicle" ? (
                <Button
                  className="h-12 w-full md:w-auto"
                  type="button"
                  onClick={goToAssignment}
                >
                  Continuer vers l’attribution
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    className="h-12 px-3"
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("vehicle")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Retour</span>
                  </Button>
                  <Button
                    className="h-12 min-w-0 flex-1 md:flex-none"
                    disabled={isSaving || !assignees.length}
                    type="submit"
                  >
                    {isSaving ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : null}
                    Créer et prendre les photos
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      )}

      {isScannerOpen ? (
        <LicensePlateScanner
          country={licensePlateCountry}
          onClose={() => setIsScannerOpen(false)}
          onConfirm={(result) => {
            setLicensePlate(result.value);
            setLicensePlateCountry(result.country);
            setRecognitionConfidence(result.confidence);
            setIsScannerOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function StepButton({
  active,
  icon,
  label,
  onClick,
  summary,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  summary: string;
}) {
  return (
    <button
      aria-current={active ? "step" : undefined}
      className={cn(
        "min-w-0 rounded-lg border p-3 text-left transition",
        active
          ? "border-teal-700 bg-teal-50 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300",
      )}
      type="button"
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            active ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-500",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-950">
            {label}
          </span>
          <span className="block truncate text-xs text-gray-500">
            {summary}
          </span>
        </span>
      </span>
    </button>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="truncate font-medium text-gray-950">{value}</p>
    </div>
  );
}

function preferencesStorageKey(userId?: string) {
  return `${preferencesStoragePrefix}:${userId ?? "anonymous"}`;
}

function readPreferences(userId?: string): RiskCreatePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(preferencesStorageKey(userId));
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<RiskCreatePreferences>;
    if (
      typeof parsed.agencyId !== "string" ||
      !Array.isArray(parsed.assigneeIds) ||
      typeof parsed.licensePlateCountry !== "string" ||
      typeof parsed.manufacturerId !== "string" ||
      typeof parsed.primaryAssigneeId !== "string"
    ) {
      return null;
    }
    return parsed as RiskCreatePreferences;
  } catch {
    return null;
  }
}

function writePreferences(
  userId: string | undefined,
  preferences: RiskCreatePreferences,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    preferencesStorageKey(userId),
    JSON.stringify(preferences),
  );
}

function removePreferences(userId?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(preferencesStorageKey(userId));
}

const selectClass =
  "h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-950 shadow-sm";
