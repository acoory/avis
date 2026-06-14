"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DecisionBadge } from "@/components/business/decision-badge";
import { LicensePlateScanner } from "@/components/business/license-plate-scanner";
import { VehicleExteriorSelector } from "@/components/business/vehicle-exterior-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatLicensePlate, formatMoney, normalizeLicensePlate } from "@/lib/format";
import { licensePlateCountries, sanitizeLicensePlateInput } from "@/lib/license-plate";
import { businessService } from "@/services/business.service";
import {
  Agency,
  Manufacturer,
  RepairDecisionInputItem,
  RepairDecisionPreview,
  RepairType,
  VehicleCheck,
  VehicleModel,
  VehiclePart,
} from "@/types/business";

type DraftRepairLine = {
  id: string;
  repairTypeId: string;
  vehiclePartId: string;
  quantity: number;
  comment: string;
  partOrderRequired: boolean;
};

type VehicleCheckFormProps = {
  initialVehicleCheck?: VehicleCheck;
};

const formSteps = [
  { title: "Vehicule", description: "Scanner ou saisir la plaque d'immatriculation." },
  { title: "Informations", description: "Agence, date et identification du vehicule." },
  { title: "Reparations", description: "Dommages constates, quantites et commentaires." },
  { title: "Synthese", description: "Decision, observations et enregistrement." },
];

const repairTypeCodesWithoutVehiclePart = new Set(["SERVICING"]);

function createDraftId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function suggestedRepairTypeId(vehiclePart: VehiclePart | undefined, repairTypes: RepairType[]) {
  if (!vehiclePart) return "";

  const exactRepairTypeCodes: Record<string, string> = {
    CHARGING_CABLE: "CABLE",
    LUGGAGE_COVER: "LUGGAGE_COVER",
    WINDSHIELD: "WINDSHIELD_REPAIR",
  };
  const categoryRepairTypeCodes: Record<string, string> = {
    BAGUETTE: "BODYWORK",
    CARROSSERIE: "BODYWORK",
    JANTE: "RIM",
    OPTIQUE: "OPTIC",
    PNEU: "TIRE",
    RETROVISEUR: "BODYWORK",
    SELLERIE: "UPHOLSTERY",
  };
  const repairTypeCode =
    exactRepairTypeCodes[vehiclePart.code] ??
    categoryRepairTypeCodes[vehiclePart.category ?? ""];

  return repairTypes.find((repairType) => repairType.code === repairTypeCode)?.id ?? "";
}

export function VehicleCheckForm({ initialVehicleCheck }: VehicleCheckFormProps) {
  const router = useRouter();
  const isCompletedEdit = initialVehicleCheck?.status === "COMPLETED";
  const formRef = useRef<HTMLFormElement | null>(null);
  const didMountRef = useRef(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([]);
  const [vehicleParts, setVehicleParts] = useState<VehiclePart[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [vehicleModelId, setVehicleModelId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [licensePlateCountry, setLicensePlateCountry] = useState("FR");
  const [licensePlateRecognitionConfidence, setLicensePlateRecognitionConfidence] = useState<
    number | undefined
  >();
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
  const [repairSheetLine, setRepairSheetLine] = useState<DraftRepairLine | null>(null);
  const [repairSheetEditingId, setRepairSheetEditingId] = useState<string | null>(null);
  const [repairSheetPreview, setRepairSheetPreview] = useState<RepairDecisionPreview | null>(null);
  const [isLicensePlateScannerOpen, setIsLicensePlateScannerOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    void Promise.all([
      businessService.agencies(),
      businessService.manufacturers(),
      businessService.repairTypes(),
      businessService.vehicleParts(),
    ]).then(([agenciesData, manufacturersData, repairTypesData, vehiclePartsData]) => {
      setAgencies(agenciesData);
      setManufacturers(manufacturersData);
      setRepairTypes(repairTypesData);
      setVehicleParts(vehiclePartsData);
      setAgencyId(initialVehicleCheck?.agency?.id ?? agenciesData[0]?.id ?? "");
      setManufacturerId(initialVehicleCheck?.manufacturer?.id ?? manufacturersData[0]?.id ?? "");
      setVehicleModelId(initialVehicleCheck?.vehicleModel?.id ?? "");
      setLicensePlate(
        initialVehicleCheck?.licensePlateRaw ??
          formatLicensePlate(
            initialVehicleCheck?.licensePlate,
            initialVehicleCheck?.licensePlateCountry,
          ),
      );
      setLicensePlateCountry(initialVehicleCheck?.licensePlateCountry ?? "FR");
      setLicensePlateRecognitionConfidence(
        initialVehicleCheck?.licensePlateRecognitionConfidence ?? undefined,
      );
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
              vehiclePartId: item.vehiclePart?.id ?? "",
              quantity: item.quantity,
              comment: item.comment ?? "",
              partOrderRequired: item.partOrderRequired,
            }))
          : [],
      );
    });
  }, [initialVehicleCheck]);

  useEffect(() => {
    if (!manufacturerId) return;
    void businessService.vehicleModels(manufacturerId).then(setVehicleModels);
  }, [manufacturerId]);

  function isVehiclePartOptional(repairTypeId: string) {
    const repairType = repairTypes.find((item) => item.id === repairTypeId);
    return repairType ? repairTypeCodesWithoutVehiclePart.has(repairType.code) : false;
  }

  function toDecisionItem(line: DraftRepairLine): RepairDecisionInputItem | null {
    if (!line.repairTypeId || line.quantity <= 0) {
      return null;
    }

    if (!line.vehiclePartId && !isVehiclePartOptional(line.repairTypeId)) {
      return null;
    }

    return {
      repairTypeId: line.repairTypeId,
      vehiclePartId: line.vehiclePartId || undefined,
      quantity: line.quantity,
      comment: line.comment || undefined,
      partOrderRequired: line.partOrderRequired,
    };
  }

  const decisionItems = useMemo<RepairDecisionInputItem[]>(
    () => lines.map(toDecisionItem).filter((item): item is RepairDecisionInputItem => Boolean(item)),
    [lines, repairTypes],
  );
  const selectedPartCounts = useMemo(
    () =>
      lines.reduce<Record<string, number>>((counts, line) => {
        if (line.vehiclePartId) {
          counts[line.vehiclePartId] = (counts[line.vehiclePartId] ?? 0) + 1;
        }
        return counts;
      }, {}),
    [lines],
  );
  const repairSheetDecisionItem = useMemo(
    () => (repairSheetLine ? toDecisionItem(repairSheetLine) : null),
    [repairSheetLine, repairTypes],
  );

  useEffect(() => {
    if (!manufacturerId || !decisionItems.length) {
      setPreview(null);
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
    if (!manufacturerId || !repairSheetDecisionItem) {
      setRepairSheetPreview(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      void businessService
        .previewDecision({ manufacturerId, items: [repairSheetDecisionItem] })
        .then((data) => setRepairSheetPreview(data))
        .catch(() => setRepairSheetPreview(null));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [manufacturerId, repairSheetDecisionItem]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeStep]);

  const selectedAgency = agencies.find((agency) => agency.id === agencyId);
  const selectedManufacturer = manufacturers.find((manufacturer) => manufacturer.id === manufacturerId);
  const emptyPreview = manufacturerId
    ? {
        manufacturerId,
        manufacturerName: selectedManufacturer?.name ?? "",
        constructorAllowanceAmount: selectedManufacturer?.rule?.constructorAllowanceAmount ?? "0.00",
        totalInternalSavingAmount: "0.00",
        totalInternalCost: "0.00",
        allowanceDifferenceAmount: selectedManufacturer?.rule?.constructorAllowanceAmount ?? "0.00",
        decisionSummary: "Aucun degat constate.",
        alerts: [],
        items: [],
        missingMandatoryRepairTypes: [],
        recommendedRepairTypes: [],
      }
    : null;
  const activePreview = manufacturerId ? (decisionItems.length ? preview : emptyPreview) : null;

  function createBlankRepairLine(): DraftRepairLine {
    return {
      id: createDraftId(),
      repairTypeId: "",
      vehiclePartId: "",
      quantity: 1,
      comment: "",
      partOrderRequired: false,
    };
  }

  function getVehiclePartIdForRepairType(repairTypeId: string, currentVehiclePartId: string) {
    return repairTypeCodesWithoutVehiclePart.has(
      repairTypes.find((item) => item.id === repairTypeId)?.code ?? "",
    )
      ? ""
      : currentVehiclePartId;
  }

  function normalizeQuantityValue(rawValue: string) {
    const digitsOnly = rawValue.replace(/\D/g, "");
    return digitsOnly ? Math.max(1, Number(digitsOnly)) : 1;
  }

  function addLine() {
    setLines((current) => [...current, createBlankRepairLine()]);
  }

  function openRepairSheet(line?: DraftRepairLine) {
    setRepairSheetLine(line ? { ...line } : createBlankRepairLine());
    setRepairSheetEditingId(line?.id ?? null);
  }

  function openRepairSheetForVehiclePart(vehiclePart: VehiclePart) {
    setRepairSheetLine({
      ...createBlankRepairLine(),
      vehiclePartId: vehiclePart.id,
      repairTypeId: suggestedRepairTypeId(vehiclePart, repairTypes),
    });
    setRepairSheetEditingId(null);
  }

  function closeRepairSheet() {
    setRepairSheetLine(null);
    setRepairSheetEditingId(null);
  }

  function patchRepairSheetLine(patch: Partial<DraftRepairLine>) {
    setRepairSheetLine((current) => (current ? { ...current, ...patch } : current));
  }

  function changeRepairSheetType(repairTypeId: string) {
    setRepairSheetLine((current) =>
      current
        ? {
            ...current,
            repairTypeId,
            vehiclePartId: getVehiclePartIdForRepairType(repairTypeId, current.vehiclePartId),
          }
        : current,
    );
  }

  function changeRepairSheetVehiclePart(vehiclePartId: string) {
    const vehiclePart = vehicleParts.find((part) => part.id === vehiclePartId);
    setRepairSheetLine((current) =>
      current
        ? {
            ...current,
            vehiclePartId,
            repairTypeId:
              suggestedRepairTypeId(vehiclePart, repairTypes) || current.repairTypeId,
          }
        : current,
    );
  }

  function saveRepairSheetLine() {
    if (!repairSheetLine?.repairTypeId) {
      toast.error("Selectionne un type de reparation.");
      return;
    }

    if (!isVehiclePartOptional(repairSheetLine.repairTypeId) && !repairSheetLine.vehiclePartId) {
      toast.error("Selectionne un element pour cette reparation.");
      return;
    }

    if (repairSheetEditingId) {
      setLines((current) =>
        current.map((line) => (line.id === repairSheetEditingId ? repairSheetLine : line)),
      );
    } else {
      setLines((current) => [...current, repairSheetLine]);
    }

    closeRepairSheet();
  }

  function updateLine(id: string, patch: Partial<DraftRepairLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function changeRepairType(id: string, repairTypeId: string) {
    setLines((current) =>
      current.map((line) => {
        if (line.id !== id) {
          return line;
        }

        return {
          ...line,
          repairTypeId,
          vehiclePartId: getVehiclePartIdForRepairType(repairTypeId, line.vehiclePartId),
        };
      }),
    );
  }

  function changeVehiclePart(id: string, vehiclePartId: string) {
    const vehiclePart = vehicleParts.find((part) => part.id === vehiclePartId);
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? {
              ...line,
              vehiclePartId,
              repairTypeId:
                suggestedRepairTypeId(vehiclePart, repairTypes) || line.repairTypeId,
            }
          : line,
      ),
    );
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

  function setQuantity(id: string, rawValue: string) {
    updateLine(id, { quantity: normalizeQuantityValue(rawValue) });
  }

  function buildPayload() {
    return {
      agencyId,
      manufacturerId,
      vehicleModelId: vehicleModelId || undefined,
      licensePlate,
      licensePlateCountry,
      licensePlateRecognitionConfidence,
      checkDate,
      city,
      notes: notes || undefined,
      items: decisionItems,
    };
  }

  function validateRequiredFields() {
    if (!agencyId || !manufacturerId || !licensePlate || !city) {
      toast.error("Renseigne les informations vehicule obligatoires.");
      return false;
    }

    return true;
  }

  function validateCurrentStep() {
    if (activeStep === 0 && !licensePlate) {
      toast.error("Scanne ou renseigne l'immatriculation.");
      return false;
    }

    if (activeStep === 1 && (!agencyId || !manufacturerId || !city)) {
      toast.error("Renseigne l'agence, le constructeur et la ville.");
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

      toast.success(
        shouldComplete
          ? "Controle valide avec succes."
          : isCompletedEdit
            ? "Controle modifie avec succes."
            : "Brouillon enregistre avec succes.",
      );
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

  function goToStep(step: number) {
    if (step <= activeStep) {
      setActiveStep(step);
      return;
    }

    if (step === activeStep + 1) {
      goToNextStep();
    }
  }

  const isLastStep = activeStep === formSteps.length - 1;

  return (
    <form className="scroll-mt-16 space-y-4 pb-24 md:space-y-6 md:pb-0" ref={formRef} onSubmit={handleSubmit}>
      <StepHeader activeStep={activeStep} onStepClick={goToStep} />

      {activeStep === 0 ? (
        <Card className="relative z-0">
          <CardContent className="mx-auto max-w-xl space-y-5 p-4 md:p-8">
            <Button
              className="h-14 w-full text-base"
              type="button"
              onClick={() => setIsLicensePlateScannerOpen(true)}
            >
              <Camera className="h-5 w-5" />
              Scanner la plaque
            </Button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-medium uppercase text-gray-400">ou saisir manuellement</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="space-y-2">
              <Label>Immatriculation</Label>
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
                <select
                  aria-label="Pays de la plaque"
                  className="h-12 min-w-0 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-950 shadow-sm"
                  value={licensePlateCountry}
                  onChange={(event) => {
                    setLicensePlateCountry(event.target.value);
                    setLicensePlateRecognitionConfidence(undefined);
                  }}
                >
                  {licensePlateCountries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.code === "UNKNOWN" ? "Autre" : country.code}
                    </option>
                  ))}
                </select>
                <Input
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="h-12 min-w-0 text-base font-semibold uppercase tracking-wide"
                  maxLength={20}
                  value={licensePlate}
                  onChange={(event) => {
                    setLicensePlate(sanitizeLicensePlateInput(event.target.value));
                    setLicensePlateRecognitionConfidence(undefined);
                  }}
                  placeholder="Plaque"
                />
              </div>
              <p className="text-xs text-gray-500">
                {licensePlateRecognitionConfidence !== undefined
                  ? `Detection : ${Math.round(licensePlateRecognitionConfidence)} %, verifie la plaque avant de continuer.`
                  : "Selectionne le pays ou choisis Autre pour une plaque non referencee."}
              </p>
            </div>

            {licensePlate ? (
              <div className="rounded-md border border-teal-200 bg-teal-50 p-4 text-center">
                <p className="text-xs font-medium uppercase text-teal-700">Vehicule identifie</p>
                <p className="mt-1 text-2xl font-semibold text-gray-950">
                  {formatLicensePlate(
                    normalizeLicensePlate(licensePlate),
                    licensePlateCountry,
                    licensePlate,
                  )}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeStep === 1 ? (
        <Card className="relative z-0">
          <CardHeader className="p-4 md:p-6">
            <CardTitle>Informations du controle</CardTitle>
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
              <Input
                className="h-12 text-base md:h-10 md:text-sm"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </div>

            <div className="min-w-0 space-y-2">
              <Label>Date du controle</Label>
              <Input
                className="h-12 min-w-0 max-w-full text-base md:h-10 md:text-sm"
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
          </CardContent>
        </Card>
      ) : null}

      {activeStep === 2 ? (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 p-4 md:p-6">
          <div>
            <CardTitle>Reparations observees</CardTitle>
            <p className="mt-1 text-sm text-gray-500">{lines.length} ligne{lines.length > 1 ? "s" : ""} saisie{lines.length > 1 ? "s" : ""}</p>
          </div>
          <Button className="hidden shrink-0 md:inline-flex" disabled={!repairTypes.length} type="button" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
          <Button className="shrink-0 md:hidden" disabled={!repairTypes.length} type="button" variant="outline" onClick={() => openRepairSheet()}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 md:p-6 md:pt-0">
          <VehicleExteriorSelector
            selectedPartCounts={selectedPartCounts}
            vehicleParts={vehicleParts}
            onSelect={openRepairSheetForVehiclePart}
          />
          {!lines.length ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              <p>Aucune reparation ajoutee pour le moment.</p>
              <p className="mt-1 text-gray-500">
                Si le vehicule n'a aucun degat particulier, tu peux passer directement a l'etape suivante.
              </p>
            </div>
          ) : null}
          {lines.map((line, index) => {
            const previewLine = activePreview?.items.find(
              (item) =>
                item.repairTypeId === line.repairTypeId &&
                (line.vehiclePartId
                  ? item.vehiclePartId === line.vehiclePartId
                  : item.vehiclePartCode === "UNKNOWN"),
            );
            const lineRequiresNoVehiclePart = isVehiclePartOptional(line.repairTypeId);
            const repairTypeName = repairTypes.find((repairType) => repairType.id === line.repairTypeId)?.name ?? "-";
            const vehiclePartName = lineRequiresNoVehiclePart
              ? "Aucun element requis"
              : vehicleParts.find((vehiclePart) => vehiclePart.id === line.vehiclePartId)?.name ?? "Element non selectionne";

            return (
              <div className="space-y-3 rounded-md border border-gray-200 bg-white p-3" key={line.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-950">Reparation #{index + 1}</p>
                  <div className="flex items-center gap-1">
                    <Button
                      aria-label="Modifier la reparation"
                      className="h-9 px-2 md:hidden"
                      type="button"
                      variant="ghost"
                      onClick={() => openRepairSheet(line)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
                </div>

                <div className="space-y-2 md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-950">{repairTypeName} x{line.quantity}</p>
                      <p className="mt-1 text-sm text-gray-500">{vehiclePartName}</p>
                    </div>
                    {previewLine ? <DecisionBadge status={previewLine.decisionStatus} /> : null}
                  </div>
                  {line.comment.trim() ? <p className="text-sm text-gray-600">{line.comment}</p> : null}
                  {line.partOrderRequired ? <PartOrderDraftBadge /> : null}
                </div>

                <div className="hidden md:block">
                  <RepairEditorFields
                    line={line}
                    repairTypes={repairTypes}
                    vehicleParts={vehicleParts}
                    isVehiclePartOptional={isVehiclePartOptional}
                    onPatch={(patch) => updateLine(line.id, patch)}
                    onVehiclePartChange={(vehiclePartId) => changeVehiclePart(line.id, vehiclePartId)}
                    onRepairTypeChange={(repairTypeId) => changeRepairType(line.id, repairTypeId)}
                    onQuantityChange={(rawValue) => setQuantity(line.id, rawValue)}
                    onQuantityDelta={(delta) => {
                      if (delta > 0) {
                        incrementQuantity(line.id);
                      } else {
                        decrementQuantity(line.id);
                      }
                    }}
                  />
                </div>

                {previewLine ? (
                  <div className="hidden flex-col gap-2 rounded-md bg-gray-50 p-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between md:flex">
                    <div className="flex items-center gap-2">
                      <DecisionBadge status={previewLine.decisionStatus} />
                      <span>{previewLine.decisionMessage}</span>
                    </div>
                    <span className="font-medium text-gray-950">
                      {formatMoney(previewLine.totalInternalSavingAmount)} economie reference
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
      ) : null}

      {activeStep === 3 ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle>Synthese decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
              <DecisionSummaryPanel
                agencyName={selectedAgency?.name ?? "-"}
                manufacturerName={selectedManufacturer?.name ?? "-"}
                preview={activePreview}
              />
            </CardContent>
          </Card>
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
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur md:hidden">
        {activeStep >= 2 ? (
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">Economie reference</span>
            <span className="font-semibold text-teal-700">
              {formatMoney(activePreview?.totalInternalSavingAmount)}
            </span>
          </div>
        ) : null}
        <StepActions
          activeStep={activeStep}
          isLastStep={isLastStep}
          isSaving={isSaving}
          isCompletedEdit={isCompletedEdit}
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
          isCompletedEdit={isCompletedEdit}
          onBack={goToPreviousStep}
          onNext={goToNextStep}
          onValidate={openValidationRecap}
        />
      </div>

      {activeStep === 2 && !repairSheetLine ? (
        <Button
          aria-label="Ajouter une reparation"
          className="fixed bottom-24 right-4 z-40 h-12 w-12 rounded-full shadow-lg md:hidden"
          disabled={!repairTypes.length}
          size="icon"
          type="button"
          onClick={() => openRepairSheet()}
        >
          <Plus className="h-5 w-5" />
        </Button>
      ) : null}

      {repairSheetLine ? (
        <RepairBottomSheet
          isEditing={Boolean(repairSheetEditingId)}
          line={repairSheetLine}
          preview={repairSheetPreview}
          repairTypes={repairTypes}
          vehicleParts={vehicleParts}
          isVehiclePartOptional={isVehiclePartOptional}
          onCancel={closeRepairSheet}
          onConfirm={saveRepairSheetLine}
          onPatch={patchRepairSheetLine}
          onVehiclePartChange={changeRepairSheetVehiclePart}
          onQuantityChange={(rawValue) => patchRepairSheetLine({ quantity: normalizeQuantityValue(rawValue) })}
          onQuantityDelta={(delta) =>
            patchRepairSheetLine({
              quantity: Math.max(1, repairSheetLine.quantity + delta),
            })
          }
          onRepairTypeChange={changeRepairSheetType}
        />
      ) : null}

      {isLicensePlateScannerOpen ? (
        <LicensePlateScanner
          country={licensePlateCountry}
          onClose={() => setIsLicensePlateScannerOpen(false)}
          onConfirm={(result) => {
            setLicensePlate(sanitizeLicensePlateInput(result.value));
            setLicensePlateCountry(result.country);
            setLicensePlateRecognitionConfidence(result.confidence);
            setIsLicensePlateScannerOpen(false);
          }}
        />
      ) : null}

      {isRecapOpen ? (
        <ValidationRecap
          city={city}
          isSaving={isSaving}
          licensePlate={licensePlate}
          licensePlateCountry={licensePlateCountry}
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
    <Card className="sticky top-16 z-20 -mx-4 -mt-4 mb-2 rounded-none border-x-0 bg-white shadow-sm md:static md:mx-0 md:mt-0 md:mb-0 md:rounded-lg md:border-x">
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
  isCompletedEdit,
  onBack,
  onNext,
  onValidate,
}: {
  activeStep: number;
  isLastStep: boolean;
  isSaving: boolean;
  isCompletedEdit: boolean;
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
    <div
      className={
        isCompletedEdit
          ? "grid grid-cols-2 gap-2 md:flex md:justify-between"
          : "grid grid-cols-[0.85fr_1fr_1fr] gap-2 md:flex md:justify-between"
      }
    >
      <Button disabled={isSaving} type="button" variant="outline" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" />
        Retour
      </Button>
      <div className="contents md:flex md:gap-2">
        <Button disabled={isSaving} type="submit" variant={isCompletedEdit ? "default" : "outline"}>
          <Save className="h-4 w-4" />
          {isSaving ? "Enregistrement..." : isCompletedEdit ? "Enregistrer" : "Brouillon"}
        </Button>
        {!isCompletedEdit ? (
          <Button disabled={isSaving} type="button" onClick={onValidate}>
            <CheckCircle2 className="h-4 w-4" />
            Valider
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RepairBottomSheet({
  isEditing,
  line,
  preview,
  repairTypes,
  vehicleParts,
  isVehiclePartOptional,
  onCancel,
  onConfirm,
  onPatch,
  onVehiclePartChange,
  onQuantityChange,
  onQuantityDelta,
  onRepairTypeChange,
}: {
  isEditing: boolean;
  line: DraftRepairLine;
  preview: RepairDecisionPreview | null;
  repairTypes: RepairType[];
  vehicleParts: VehiclePart[];
  isVehiclePartOptional: (repairTypeId: string) => boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onPatch: (patch: Partial<DraftRepairLine>) => void;
  onVehiclePartChange: (vehiclePartId: string) => void;
  onQuantityChange: (rawValue: string) => void;
  onQuantityDelta: (delta: number) => void;
  onRepairTypeChange: (repairTypeId: string) => void;
}) {
  const previewItem = preview?.items[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 motion-safe:animate-[vehicle-check-sheet-overlay-in_160ms_ease-out] md:items-stretch md:justify-end">
      <div className="max-h-[94vh] w-full overflow-hidden rounded-t-xl bg-white shadow-xl motion-safe:animate-[vehicle-check-sheet-in_220ms_cubic-bezier(0.22,1,0.36,1)] md:h-full md:max-h-none md:max-w-xl md:rounded-none">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-950">
              {isEditing ? "Modifier la reparation" : "Nouvelle reparation"}
            </h2>
          </div>
          <button
            aria-label="Fermer la fiche reparation"
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
            type="button"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(94vh-112px)] overflow-x-hidden overflow-y-auto p-4 pt-3 md:max-h-[calc(100dvh-112px)]">
          {previewItem ? (
            <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-950">Decision provisoire</p>
                  <p className="mt-0.5 truncate text-gray-600">{previewItem.decisionMessage}</p>
                </div>
                <DecisionBadge status={previewItem.decisionStatus} />
              </div>
              <div className="mt-2 flex items-center justify-between text-gray-600">
                <span>Economie reference</span>
                <span className="font-semibold text-gray-950">
                  {formatMoney(previewItem.totalInternalSavingAmount)}
                </span>
              </div>
            </div>
          ) : null}
          <RepairEditorFields
            layout="sheet"
            line={line}
            repairTypes={repairTypes}
            vehicleParts={vehicleParts}
            isVehiclePartOptional={isVehiclePartOptional}
            onPatch={onPatch}
            onVehiclePartChange={onVehiclePartChange}
            onQuantityChange={onQuantityChange}
            onQuantityDelta={onQuantityDelta}
            onRepairTypeChange={onRepairTypeChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-gray-100 bg-white p-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="button" onClick={onConfirm}>
            {isEditing ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RepairEditorFields({
  layout = "default",
  line,
  repairTypes,
  vehicleParts,
  isVehiclePartOptional,
  onPatch,
  onVehiclePartChange,
  onQuantityChange,
  onQuantityDelta,
  onRepairTypeChange,
}: {
  layout?: "default" | "sheet";
  line: DraftRepairLine;
  repairTypes: RepairType[];
  vehicleParts: VehiclePart[];
  isVehiclePartOptional: (repairTypeId: string) => boolean;
  onPatch: (patch: Partial<DraftRepairLine>) => void;
  onVehiclePartChange: (vehiclePartId: string) => void;
  onQuantityChange: (rawValue: string) => void;
  onQuantityDelta: (delta: number) => void;
  onRepairTypeChange: (repairTypeId: string) => void;
}) {
  const lineRequiresNoVehiclePart = isVehiclePartOptional(line.repairTypeId);
  const gridClass =
    layout === "sheet" ? "grid gap-3" : "grid gap-3 lg:grid-cols-[1fr_1fr_140px]";
  const quickButtonsClass =
    layout === "sheet"
      ? "mt-2 flex w-full min-w-0 flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
      : "mt-2 flex flex-wrap gap-1.5";
  const quickButtonClass = layout === "sheet" ? "shrink-0 whitespace-nowrap" : "";

  return (
    <div className="space-y-3">
      <div className={gridClass}>
        <div className="min-w-0 space-y-2">
          <Label>Element</Label>
          {lineRequiresNoVehiclePart ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-500 md:py-2.5">
              Aucun element requis pour ce type.
            </div>
          ) : (
            <VehiclePartAutocomplete
              compact={layout === "sheet"}
              vehicleParts={vehicleParts}
              value={line.vehiclePartId}
              onChange={onVehiclePartChange}
            />
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <Label>Type</Label>
          <select
            className="h-12 w-full rounded-md border border-gray-200 bg-white px-3 text-base text-gray-950 shadow-sm md:h-10 md:text-sm"
            value={line.repairTypeId}
            onChange={(event) => onRepairTypeChange(event.target.value)}
          >
            <option value="">Selectionner un type</option>
            {repairTypes.map((repairType) => (
              <option key={repairType.id} value={repairType.id}>
                {repairType.name}
              </option>
            ))}
          </select>
          {line.repairTypeId &&
          line.repairTypeId ===
            suggestedRepairTypeId(
              vehicleParts.find((vehiclePart) => vehiclePart.id === line.vehiclePartId),
              repairTypes,
            ) ? (
            <p className="text-xs font-medium text-teal-700">
              Type suggere automatiquement, modifiable si besoin.
            </p>
          ) : null}
          <div className={quickButtonsClass}>
            {repairTypes
              .filter((repairType) => repairType.isActive)
              .slice(0, 10)
              .map((repairType) => (
                <button
                  className={[
                    quickButtonClass,
                    "rounded-md px-2 py-1 text-xs font-medium",
                    repairType.id === line.repairTypeId
                      ? "bg-teal-50 text-teal-800"
                      : "bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-800",
                  ].join(" ")}
                  key={repairType.id}
                  type="button"
                  onClick={() => onRepairTypeChange(repairType.id)}
                >
                  {repairType.name}
                </button>
              ))}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <Label>Quantite</Label>
          <div className="grid grid-cols-[48px_1fr_48px] overflow-hidden rounded-md border border-gray-200 bg-white">
            <button
              className="h-12 border-r border-gray-200 text-lg font-semibold text-gray-700"
              type="button"
              onClick={() => onQuantityDelta(-1)}
            >
              -
            </button>
            <Input
              className="h-12 rounded-none border-0 px-1 text-center text-base font-semibold shadow-none focus:border-0"
              inputMode="numeric"
              pattern="[0-9]*"
              type="text"
              value={String(line.quantity)}
              onChange={(event) => onQuantityChange(event.target.value)}
            />
            <button
              className="h-12 border-l border-gray-200 text-lg font-semibold text-gray-700"
              type="button"
              onClick={() => onQuantityDelta(1)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Commentaire</Label>
        <Input
          className="h-12 text-base md:h-10 md:text-sm"
          placeholder="Ex: rayure profonde"
          value={line.comment}
          onChange={(event) => onPatch({ comment: event.target.value })}
        />
      </div>

      <label className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
        <input
          checked={line.partOrderRequired}
          className="h-4 w-4 accent-teal-700"
          type="checkbox"
          onChange={(event) => onPatch({ partOrderRequired: event.target.checked })}
        />
        <span>Pièce à commander</span>
      </label>
    </div>
  );
}

function VehiclePartAutocomplete({
  compact = false,
  vehicleParts,
  value,
  onChange,
}: {
  compact?: boolean;
  vehicleParts: VehiclePart[];
  value: string;
  onChange: (vehiclePartId: string) => void;
}) {
  const selectedPart = vehicleParts.find((vehiclePart) => vehiclePart.id === value);
  const [query, setQuery] = useState(selectedPart?.name ?? "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setQuery(selectedPart?.name ?? "");
  }, [selectedPart?.name]);

  const filteredVehicleParts = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    const visibleVehicleParts = vehicleParts.filter((vehiclePart) => vehiclePart.code !== "UNKNOWN");

    if (!normalizedQuery) {
      return visibleVehicleParts.slice(0, 10);
    }

    return visibleVehicleParts
      .filter((vehiclePart) =>
        normalizeSearchText(`${vehiclePart.name} ${vehiclePart.code} ${vehiclePart.category ?? ""}`).includes(
          normalizedQuery,
        ),
      )
      .slice(0, 10);
  }, [query, vehicleParts]);
  const availableCategories = useMemo(
    () =>
      Array.from(
        new Set(
          vehicleParts
            .map((vehiclePart) => vehiclePart.category)
            .filter((category): category is string => Boolean(category) && category !== "GENERAL"),
        ),
      ),
    [vehicleParts],
  );

  function selectVehiclePart(vehiclePart: VehiclePart) {
    onChange(vehiclePart.id);
    setQuery(vehiclePart.name);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          autoComplete="off"
          className="h-12 pl-9 text-base md:h-10 md:text-sm"
          placeholder="Rechercher un element..."
          value={query}
          onBlur={() => {
            window.setTimeout(() => {
              setIsOpen(false);
              setQuery(selectedPart?.name ?? "");
            }, 120);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {filteredVehicleParts.length ? (
            filteredVehicleParts.map((vehiclePart) => (
              <button
                className={[
                  "flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-teal-50",
                  vehiclePart.id === value ? "bg-teal-50 text-teal-900" : "text-gray-800",
                ].join(" ")}
                key={vehiclePart.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectVehiclePart(vehiclePart)}
              >
                <span className="font-medium">{vehiclePart.name}</span>
                {vehiclePart.category ? (
                  <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {vehiclePart.category.toLowerCase()}
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">Aucun element trouve</div>
          )}
        </div>
      ) : null}

      {availableCategories.length ? (
        <div
          className={
            compact
              ? "mt-2 flex w-full min-w-0 flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
              : "mt-2 flex flex-wrap gap-1.5"
          }
        >
          {availableCategories.map((category) => (
            <button
              className={[
                compact ? "shrink-0 whitespace-nowrap" : "",
                "rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-teal-50 hover:text-teal-800",
              ].join(" ")}
              key={category}
              type="button"
              onClick={() => {
                setQuery(category.toLowerCase());
                setIsOpen(true);
              }}
            >
              {category.toLowerCase()}
            </button>
          ))}
        </div>
      ) : null}
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
  const recommendedItems = preview?.recommendedRepairTypes ?? [];
  const generalAlerts =
    preview?.alerts.filter(
      (alert) => !mandatoryItems.some((item) => item.message === alert),
    ) ?? [];

  if (!preview) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Aucune reparation renseignee. Tu peux continuer si le vehicule n'a aucun degat particulier.
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
                  <p key={`${item.repairTypeId}-${item.vehiclePartId ?? "any"}`}>
                    {item.vehiclePartName ? `${item.vehiclePartName} - ` : ""}
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
              <p className="font-semibold">
                {preview.items.length ? "Aucun blocage constructeur détecté" : "Aucun degat signale"}
              </p>
              <p className="mt-1 text-sm">
                {preview.items.length
                  ? "Tu peux vérifier les recommandations et alertes ci-dessous."
                  : "Tu peux continuer et valider le controle tel quel si besoin."}
              </p>
            </div>
          </div>
        </div>
      )}

      {recommendedItems.length ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sky-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Recommandations constructeur</p>
              <div className="mt-2 space-y-1 text-sm">
                {recommendedItems.map((item) => (
                  <p key={`${item.repairTypeId}-${item.vehiclePartId ?? "any"}`}>{item.message}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
        <Summary label="Economie reference" value={formatMoney(preview.totalInternalSavingAmount)} />
        <Summary label="Franchise constructeur" value={formatMoney(preview.constructorAllowanceAmount)} />
        <Summary label="Pieces a commander" value={partOrderSummaryLabel(preview.items)} />
      </div>

      <div className="rounded-md border border-gray-200">
        <div className="border-b border-gray-100 px-3 py-2">
          <p className="text-sm font-medium text-gray-950">Decisions par reparation</p>
          <p className="mt-1 text-xs text-gray-500">{preview.decisionSummary}</p>
        </div>
        <div className="divide-y divide-gray-100">
          {preview.items.length ? (
            preview.items.map((item, index) => (
              <div className="space-y-2 p-3" key={`${item.repairTypeId}-${item.vehiclePartId}-${index}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">{item.vehiclePartName}</p>
                    <p className="font-medium text-gray-950">
                      {item.repairTypeName} x{item.quantity}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">{item.decisionMessage}</p>
                    {item.partOrderRequired ? <PartOrderDraftBadge /> : null}
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
            ))
          ) : (
            <div className="p-3 text-sm text-gray-600">Aucun degat signale.</div>
          )}
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

function PartOrderDraftBadge() {
  return (
    <span className="mt-2 inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
      Pièce à commander
    </span>
  );
}

function partOrderSummaryLabel(items: RepairDecisionPreview["items"]) {
  const count = items.filter((item) => item.partOrderRequired).length;

  if (!count) {
    return "Aucune";
  }

  return `${count} pièce${count > 1 ? "s" : ""}`;
}

function ValidationRecap({
  city,
  isSaving,
  licensePlate,
  licensePlateCountry,
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
  licensePlateCountry: string;
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
              Verifie les informations avant de valider le controle.
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
            <RecapLine
              label="Immatriculation"
              value={formatLicensePlate(
                normalizeLicensePlate(licensePlate),
                licensePlateCountry,
                licensePlate,
              )}
            />
            <RecapLine label="Constructeur" value={manufacturerName} />
            <RecapLine label="Modele" value={vehicleModelName} />
            <RecapLine label="Agence" value={selectedAgencyName} />
            <RecapLine label="Ville" value={city} />
            <RecapLine label="Economie reference" value={formatMoney(preview?.totalInternalSavingAmount)} />
            <RecapLine label="Franchise constructeur" value={formatMoney(preview?.constructorAllowanceAmount)} />
            <RecapLine label="Pieces a commander" value={partOrderSummaryLabel(preview?.items ?? [])} />
          </div>

          <div className="rounded-md border border-gray-200">
            <div className="border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-950">
              Reparations
            </div>
            <div className="divide-y divide-gray-100">
              {preview?.items.length ? (
                preview.items.map((item, index) => (
                  <div className="space-y-2 p-3" key={`${item.repairTypeId}-${item.vehiclePartId}-${index}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-500">{item.vehiclePartName}</p>
                        <p className="font-medium text-gray-950">
                          {item.repairTypeName} x{item.quantity}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">{item.decisionMessage}</p>
                        {item.partOrderRequired ? <PartOrderDraftBadge /> : null}
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
                ))
              ) : (
                <div className="p-3 text-sm text-gray-600">Aucun degat signale.</div>
              )}
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

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
