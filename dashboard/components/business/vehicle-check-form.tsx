"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DecisionBadge } from "@/components/business/decision-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatLicensePlate, formatMoney, normalizeLicensePlate } from "@/lib/format";
import { businessService } from "@/services/business.service";
import {
  Agency,
  Manufacturer,
  RepairDecisionInputItem,
  RepairDecisionPreview,
  RepairType,
  VehicleCheck,
  VehicleModel,
} from "@/types/business";

type DraftRepairLine = {
  id: string;
  repairTypeId: string;
  quantity: number;
  comment: string;
};

type VehicleCheckFormProps = {
  initialVehicleCheck?: VehicleCheck;
};

const formSteps = [
  { title: "Vehicule", description: "Identification du vehicule et du constructeur." },
  { title: "Reparations observees", description: "Dommages constates, quantites et commentaires." },
  { title: "Synthèse décision", description: "Calculs et alertes generes par les regles constructeur." },
  { title: "Observations", description: "Commentaire final et enregistrement." },
];

export function VehicleCheckForm({ initialVehicleCheck }: VehicleCheckFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const didMountRef = useRef(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [vehicleModelId, setVehicleModelId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [mileage, setMileage] = useState("");
  const [checkDate, setCheckDate] = useState(
    initialVehicleCheck?.checkDate
      ? new Date(initialVehicleCheck.checkDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftRepairLine[]>([]);
  const [preview, setPreview] = useState<RepairDecisionPreview | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    void Promise.all([
      businessService.agencies(),
      businessService.manufacturers(),
      businessService.repairTypes(),
    ]).then(([agenciesData, manufacturersData, repairTypesData]) => {
      setAgencies(agenciesData);
      setManufacturers(manufacturersData);
      setRepairTypes(repairTypesData);
      setAgencyId(initialVehicleCheck?.agency?.id ?? agenciesData[0]?.id ?? "");
      setManufacturerId(initialVehicleCheck?.manufacturer?.id ?? manufacturersData[0]?.id ?? "");
      setVehicleModelId(initialVehicleCheck?.vehicleModel?.id ?? "");
      setLicensePlate(initialVehicleCheck?.licensePlate ?? "");
      setMileage(initialVehicleCheck?.mileage ? String(initialVehicleCheck.mileage) : "");
      setCheckDate(
        initialVehicleCheck?.checkDate
          ? new Date(initialVehicleCheck.checkDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      );
      setCity(initialVehicleCheck?.city ?? agenciesData[0]?.city ?? "");
      setNotes(initialVehicleCheck?.notes ?? "");
      setLines(
        initialVehicleCheck?.items?.length
          ? initialVehicleCheck.items.map((item) => ({
              id: item.id,
              repairTypeId: item.repairType.id,
              quantity: item.quantity,
              comment: item.comment ?? "",
            }))
          : [],
      );
    });
  }, [initialVehicleCheck]);

  useEffect(() => {
    if (!manufacturerId) return;
    void businessService.vehicleModels(manufacturerId).then(setVehicleModels);
  }, [manufacturerId]);

  const decisionItems = useMemo<RepairDecisionInputItem[]>(
    () =>
      lines
        .filter((line) => line.repairTypeId && line.quantity > 0)
        .map((line) => ({
          repairTypeId: line.repairTypeId,
          quantity: line.quantity,
          comment: line.comment || undefined,
        })),
    [lines],
  );

  useEffect(() => {
    if (!manufacturerId || !decisionItems.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void businessService
        .previewDecision({ manufacturerId, items: decisionItems })
        .then((data) => {
          setPreview(data);
        })
        .catch(() => toast.error("Impossible de calculer la decision pour le moment."));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [manufacturerId, decisionItems]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeStep]);

  const selectedAgency = agencies.find((agency) => agency.id === agencyId);
  const selectedManufacturer = manufacturers.find((manufacturer) => manufacturer.id === manufacturerId);
  const activePreview = manufacturerId && decisionItems.length ? preview : null;

  function addLine() {
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        repairTypeId: repairTypes[0]?.id ?? "",
        quantity: 1,
        comment: "",
      },
    ]);
  }

  function updateLine(id: string, patch: Partial<DraftRepairLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id));
  }

  function incrementQuantity(id: string) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, quantity: line.quantity + 1 } : line)),
    );
  }

  function decrementQuantity(id: string) {
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, quantity: Math.max(1, line.quantity - 1) } : line,
      ),
    );
  }

  function buildPayload() {
    return {
      agencyId,
      manufacturerId,
      vehicleModelId: vehicleModelId || undefined,
      licensePlate,
      mileage: mileage ? Number(mileage) : undefined,
      checkDate,
      city,
      notes: notes || undefined,
      items: decisionItems,
    };
  }

  function validateRequiredFields() {
    if (!agencyId || !manufacturerId || !licensePlate || !city || !decisionItems.length) {
      toast.error("Renseigne les informations vehicule et au moins une reparation.");
      return false;
    }

    return true;
  }

  function validateCurrentStep() {
    if (activeStep === 0 && (!agencyId || !manufacturerId || !licensePlate || !city)) {
      toast.error("Renseigne l'agence, le constructeur, l'immatriculation et la ville.");
      return false;
    }

    if (activeStep === 1 && !decisionItems.length) {
      toast.error("Ajoute au moins une reparation observee.");
      return false;
    }

    return true;
  }

  async function saveVehicleCheck(shouldComplete: boolean) {
    if (!validateRequiredFields()) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildPayload();
      const savedVehicleCheck = initialVehicleCheck
        ? await businessService.updateVehicleCheck(initialVehicleCheck.id, payload)
        : await businessService.createVehicleCheck(payload);

      const finalVehicleCheck = shouldComplete
        ? await businessService.completeVehicleCheck(savedVehicleCheck.id)
        : savedVehicleCheck;

      toast.success(shouldComplete ? "Controle valide avec succes." : "Brouillon enregistre avec succes.");
      router.replace(`/dashboard/vehicle-checks/${finalVehicleCheck.id}`);
    } catch {
      toast.error(
        shouldComplete
          ? "Impossible de valider ce controle. Verifie les reparations interdites."
          : "Impossible d'enregistrer le controle.",
      );
    } finally {
      setIsSaving(false);
      setIsRecapOpen(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveVehicleCheck(false);
  }

  function openValidationRecap() {
    if (!validateRequiredFields()) {
      return;
    }

    setIsRecapOpen(true);
  }

  function goToNextStep() {
    if (!validateCurrentStep()) {
      return;
    }

    setActiveStep((current) => Math.min(current + 1, formSteps.length - 1));
  }

  function goToPreviousStep() {
    setActiveStep((current) => Math.max(current - 1, 0));
  }

  const isLastStep = activeStep === formSteps.length - 1;

  return (
    <form className="scroll-mt-16 space-y-4 pb-24 md:space-y-6 md:pb-0" ref={formRef} onSubmit={handleSubmit}>
      <StepHeader activeStep={activeStep} onStepClick={setActiveStep} />

      {activeStep === 0 ? (
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle>Vehicule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0 md:grid-cols-2 md:p-6 md:pt-0 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>Agence</Label>
            <select
              className="h-12 w-full rounded-md border border-gray-200 bg-white px-3 text-base text-gray-950 shadow-sm md:h-10 md:text-sm"
              value={agencyId}
              onChange={(event) => {
                setAgencyId(event.target.value);
                const agency = agencies.find((item) => item.id === event.target.value);
                if (agency) setCity(agency.city);
              }}
            >
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Ville</Label>
            <Input className="h-12 text-base md:h-10 md:text-sm" value={city} onChange={(event) => setCity(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Date du controle</Label>
            <Input
              className="h-12 text-base md:h-10 md:text-sm"
              type="date"
              value={checkDate}
              onChange={(event) => setCheckDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Constructeur</Label>
            <select
              className="h-12 w-full rounded-md border border-gray-200 bg-white px-3 text-base text-gray-950 shadow-sm md:h-10 md:text-sm"
              value={manufacturerId}
              onChange={(event) => {
                setManufacturerId(event.target.value);
                setVehicleModelId("");
              }}
            >
              {manufacturers.map((manufacturer) => (
                <option key={manufacturer.id} value={manufacturer.id}>
                  {manufacturer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Modele</Label>
            <select
              className="h-12 w-full rounded-md border border-gray-200 bg-white px-3 text-base text-gray-950 shadow-sm md:h-10 md:text-sm"
              value={vehicleModelId}
              onChange={(event) => setVehicleModelId(event.target.value)}
            >
              <option value="">Non precise</option>
              {vehicleModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Immatriculation</Label>
            <Input
              autoCapitalize="characters"
              autoComplete="off"
              className="h-12 text-base font-semibold uppercase tracking-wide md:h-10 md:text-sm"
              value={licensePlate}
              onChange={(event) => setLicensePlate(normalizeLicensePlate(event.target.value))}
              placeholder="ER54678"
            />
          </div>

          <div className="space-y-2">
            <Label>Kilometrage</Label>
            <Input
              className="h-12 text-base md:h-10 md:text-sm"
              inputMode="numeric"
              type="number"
              value={mileage}
              onChange={(event) => setMileage(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      ) : null}

      {activeStep === 1 ? (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 p-4 md:p-6">
          <div>
            <CardTitle>Reparations observees</CardTitle>
            <p className="mt-1 text-sm text-gray-500">{lines.length} ligne{lines.length > 1 ? "s" : ""} saisie{lines.length > 1 ? "s" : ""}</p>
          </div>
          <Button className="shrink-0" type="button" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 md:p-6 md:pt-0">
          {!lines.length ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              Aucune reparation ajoutee pour le moment.
            </div>
          ) : null}
          {lines.map((line, index) => {
            const previewLine = activePreview?.items.find((item) => item.repairTypeId === line.repairTypeId);

            return (
              <div className="space-y-3 rounded-md border border-gray-200 bg-white p-3" key={line.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-950">Reparation #{index + 1}</p>
                  <Button
                    aria-label="Retirer la reparation"
                    className="h-9 px-2 text-red-600 hover:bg-red-50"
                    type="button"
                    variant="ghost"
                    onClick={() => removeLine(line.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_160px_1fr]">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select
                      className="h-12 w-full rounded-md border border-gray-200 bg-white px-3 text-base text-gray-950 shadow-sm md:h-10 md:text-sm"
                      value={line.repairTypeId}
                      onChange={(event) => updateLine(line.id, { repairTypeId: event.target.value })}
                    >
                      {repairTypes.map((repairType) => (
                        <option key={repairType.id} value={repairType.id}>
                          {repairType.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantite</Label>
                    <div className="grid grid-cols-[48px_1fr_48px] overflow-hidden rounded-md border border-gray-200 bg-white">
                      <button
                        className="h-12 border-r border-gray-200 text-lg font-semibold text-gray-700"
                        type="button"
                        onClick={() => decrementQuantity(line.id)}
                      >
                        -
                      </button>
                      <Input
                        className="h-12 rounded-none border-0 text-center text-base shadow-none focus:border-0 md:h-12"
                        inputMode="numeric"
                        min={1}
                        type="number"
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) || 1 })}
                      />
                      <button
                        className="h-12 border-l border-gray-200 text-lg font-semibold text-gray-700"
                        type="button"
                        onClick={() => incrementQuantity(line.id)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Commentaire</Label>
                    <Input
                      className="h-12 text-base md:h-10 md:text-sm"
                      placeholder="Ex: pare-choc av droit"
                      value={line.comment}
                      onChange={(event) => updateLine(line.id, { comment: event.target.value })}
                    />
                  </div>
                </div>

                {previewLine ? (
                  <div className="flex flex-col gap-2 rounded-md bg-gray-50 p-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <DecisionBadge status={previewLine.decisionStatus} />
                      <span>{previewLine.decisionMessage}</span>
                    </div>
                    <span className="font-medium text-gray-950">
                      {formatMoney(previewLine.totalInternalSavingAmount)} economie | {formatMoney(previewLine.totalInternalCost)} cout
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
      ) : null}

      {activeStep === 2 ? (
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle>Synthèse décision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
          <DecisionSummaryPanel
            agencyName={selectedAgency?.name ?? "-"}
            manufacturerName={selectedManufacturer?.name ?? "-"}
            preview={activePreview}
          />
        </CardContent>
      </Card>
      ) : null}

      {activeStep === 3 ? (
      <Card>
        <CardContent className="space-y-3 p-4 md:p-5">
          <Label>Observations</Label>
          <textarea
            className="min-h-28 w-full rounded-md border border-gray-200 px-3 py-2 text-base text-gray-950 shadow-sm md:text-sm"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </CardContent>
      </Card>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur md:hidden">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-gray-500">Economie estimee</span>
          <span className="font-semibold text-teal-700">{formatMoney(activePreview?.totalInternalSavingAmount)}</span>
        </div>
        <StepActions
          activeStep={activeStep}
          isLastStep={isLastStep}
          isSaving={isSaving}
          onBack={goToPreviousStep}
          onNext={goToNextStep}
          onValidate={openValidationRecap}
        />
      </div>

      <div className="hidden border-t border-gray-100 pt-4 md:block">
        <StepActions
          activeStep={activeStep}
          isLastStep={isLastStep}
          isSaving={isSaving}
          onBack={goToPreviousStep}
          onNext={goToNextStep}
          onValidate={openValidationRecap}
        />
      </div>

      {isRecapOpen ? (
        <ValidationRecap
          city={city}
          isSaving={isSaving}
          licensePlate={licensePlate}
          manufacturerName={selectedManufacturer?.name ?? "-"}
          notes={notes}
          preview={activePreview}
          selectedAgencyName={selectedAgency?.name ?? "-"}
          vehicleModelName={vehicleModels.find((model) => model.id === vehicleModelId)?.name ?? "Non precise"}
          onCancel={() => setIsRecapOpen(false)}
          onConfirm={() => void saveVehicleCheck(true)}
        />
      ) : null}
    </form>
  );
}

function StepHeader({
  activeStep,
  onStepClick,
}: {
  activeStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <Card className="sticky top-16 z-20 -mx-4 rounded-none border-x-0 bg-white md:static md:mx-0 md:rounded-lg md:border-x">
      <CardContent className="space-y-2 p-3 md:space-y-4 md:p-5">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">
            Etape {activeStep + 1} sur {formSteps.length}
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-gray-950 md:mt-1 md:text-lg">
            {formSteps[activeStep].title}
          </h2>
          <p className="mt-1 hidden text-sm text-gray-500 md:block">{formSteps[activeStep].description}</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {formSteps.map((step, index) => {
            const isActive = index === activeStep;
            const isDone = index < activeStep;

            return (
              <button
                className="min-w-0 text-left"
                key={step.title}
                type="button"
                onClick={() => onStepClick(index)}
              >
                <span
                  className={[
                    "mb-1 block h-1 rounded-full md:mb-2 md:h-1.5",
                    isActive || isDone ? "bg-teal-700" : "bg-gray-200",
                  ].join(" ")}
                />
                <span
                  className={[
                    "block truncate text-xs font-medium",
                    isActive ? "text-teal-800" : "text-gray-500",
                  ].join(" ")}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StepActions({
  activeStep,
  isLastStep,
  isSaving,
  onBack,
  onNext,
  onValidate,
}: {
  activeStep: number;
  isLastStep: boolean;
  isSaving: boolean;
  onBack: () => void;
  onNext: () => void;
  onValidate: () => void;
}) {
  if (!isLastStep) {
    return (
      <div className="grid grid-cols-2 gap-2 md:flex md:justify-between">
        <Button disabled={activeStep === 0 || isSaving} type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Button>
        <Button disabled={isSaving} type="button" onClick={onNext}>
          Suivant
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[0.85fr_1fr_1fr] gap-2 md:flex md:justify-between">
      <Button disabled={isSaving} type="button" variant="outline" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" />
        Retour
      </Button>
      <div className="contents md:flex md:gap-2">
        <Button disabled={isSaving} type="submit" variant="outline">
          <Save className="h-4 w-4" />
          {isSaving ? "Enregistrement..." : "Brouillon"}
        </Button>
        <Button disabled={isSaving} type="button" onClick={onValidate}>
          <CheckCircle2 className="h-4 w-4" />
          Valider
        </Button>
      </div>
    </div>
  );
}

function DecisionSummaryPanel({
  agencyName,
  manufacturerName,
  preview,
}: {
  agencyName: string;
  manufacturerName: string;
  preview: RepairDecisionPreview | null;
}) {
  const mandatoryItems = preview?.missingMandatoryRepairTypes ?? [];
  const generalAlerts =
    preview?.alerts.filter(
      (alert) => !mandatoryItems.some((item) => item.message === alert),
    ) ?? [];

  if (!preview) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Ajoute au moins une reparation pour afficher la synthese.
      </div>
    );
  }

  return (
    <>
      {mandatoryItems.length ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">A faire obligatoirement</p>
              <div className="mt-2 space-y-1 text-sm">
                {mandatoryItems.map((item) => (
                  <p key={item.repairTypeId}>
                    {item.repairTypeName} doit etre ajoute avant la restitution.
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Aucune reparation obligatoire manquante</p>
              <p className="mt-1 text-sm">Les obligations constructeur connues sont couvertes.</p>
            </div>
          </div>
        </div>
      )}

      {generalAlerts.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Alertes a verifier</p>
              <div className="mt-2 space-y-1 text-sm">
                {generalAlerts.map((alert) => (
                  <p key={alert}>{alert}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Constructeur" value={manufacturerName} />
        <Summary label="Agence" value={agencyName} />
        <Summary label="Economie totale" value={formatMoney(preview.totalInternalSavingAmount)} />
        <Summary label="Cout interne" value={formatMoney(preview.totalInternalCost)} />
        <Summary label="Franchise constructeur" value={formatMoney(preview.constructorAllowanceAmount)} />
        <Summary label="Ecart franchise" value={formatMoney(preview.allowanceDifferenceAmount)} />
      </div>

      <div className="rounded-md border border-gray-200">
        <div className="border-b border-gray-100 px-3 py-2">
          <p className="text-sm font-medium text-gray-950">Decisions par reparation</p>
          <p className="mt-1 text-xs text-gray-500">{preview.decisionSummary}</p>
        </div>
        <div className="divide-y divide-gray-100">
          {preview.items.map((item) => (
            <div className="space-y-2 p-3" key={item.repairTypeId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-950">
                    {item.repairTypeName} x{item.quantity}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{item.decisionMessage}</p>
                </div>
                <DecisionBadge status={item.decisionStatus} />
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{item.comment?.trim() ? item.comment : "Sans commentaire"}</span>
                <span className="font-medium text-gray-950">
                  {formatMoney(item.totalInternalSavingAmount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-gray-950">{value}</p>
    </div>
  );
}

function ValidationRecap({
  city,
  isSaving,
  licensePlate,
  manufacturerName,
  notes,
  preview,
  selectedAgencyName,
  vehicleModelName,
  onCancel,
  onConfirm,
}: {
  city: string;
  isSaving: boolean;
  licensePlate: string;
  manufacturerName: string;
  notes: string;
  preview: RepairDecisionPreview | null;
  selectedAgencyName: string;
  vehicleModelName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-xl sm:mx-auto sm:max-w-2xl sm:rounded-lg">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-gray-100 bg-white p-4">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-950">Recapitulatif avant validation</h2>
            <p className="mt-1 text-sm text-gray-500">
              Une fois valide, le controle ne sera plus modifiable.
            </p>
          </div>
          <button
            aria-label="Fermer le recapitulatif"
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
            type="button"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <RecapLine label="Immatriculation" value={formatLicensePlate(licensePlate)} />
            <RecapLine label="Constructeur" value={manufacturerName} />
            <RecapLine label="Modele" value={vehicleModelName} />
            <RecapLine label="Agence" value={selectedAgencyName} />
            <RecapLine label="Ville" value={city} />
            <RecapLine label="Economie estimee" value={formatMoney(preview?.totalInternalSavingAmount)} />
            <RecapLine label="Franchise constructeur" value={formatMoney(preview?.constructorAllowanceAmount)} />
            <RecapLine label="Ecart franchise" value={formatMoney(preview?.allowanceDifferenceAmount)} />
          </div>

          <div className="rounded-md border border-gray-200">
            <div className="border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-950">
              Reparations
            </div>
            <div className="divide-y divide-gray-100">
              {preview?.items.map((item) => (
                <div className="space-y-2 p-3" key={item.repairTypeId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-950">
                        {item.repairTypeName} x{item.quantity}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">{item.decisionMessage}</p>
                    </div>
                    <DecisionBadge status={item.decisionStatus} />
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{item.comment?.trim() ? item.comment : "Sans commentaire"}</span>
                    <span className="font-medium text-gray-950">
                      {formatMoney(item.totalInternalSavingAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {preview?.alerts.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {preview.alerts.map((alert) => (
                <p key={alert}>{alert}</p>
              ))}
            </div>
          ) : null}

          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase text-gray-500">Observations</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{notes.trim() ? notes : "-"}</p>
          </div>
        </div>

        <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-gray-100 bg-white p-4">
          <Button disabled={isSaving} type="button" variant="outline" onClick={onCancel}>
            Retour
          </Button>
          <Button disabled={isSaving} type="button" onClick={onConfirm}>
            <CheckCircle2 className="h-4 w-4" />
            {isSaving ? "Validation..." : "Confirmer la validation"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecapLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-950">{value || "-"}</p>
    </div>
  );
}
