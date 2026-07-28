"use client";

import Link from "next/link";
import { Building2, CalendarDays, Car, CarFront, CheckCircle2, CheckSquare2, ChevronDown, ChevronLeft, ChevronRight, MapPin, Minus, Package, UserRound, Wrench } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RepairRequestEmailDialog } from "@/components/business/repair-request-email-dialog";
import { VehicleCheckActions } from "@/components/business/vehicle-check-actions";
import { VehicleRecoveredDialog } from "@/components/business/vehicle-recovered-dialog";
import { VehicleCheckStatusBadge } from "@/components/business/decision-badge";
import { RepairItemsTable } from "@/components/business/vehicle-check-table";
import {
  VehicleCheckSummarySelection,
  VehicleCheckTimingSummary,
} from "@/components/business/vehicle-check-summary-selection";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { formatDate, formatLicensePlate, formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { VehicleCheck, VehicleCheckItem } from "@/types/business";

export default function VehicleCheckDetailsPage() {
  const params = useParams<{ id: string }>();
  const [vehicleCheck, setVehicleCheck] = useState<VehicleCheck | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recoveredDialogOpen, setRecoveredDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void businessService
      .vehicleCheck(params.id)
      .then(setVehicleCheck)
      .finally(() => setIsLoading(false));
  }, [params.id]);

  function handlePartOrderUpdated(updatedItem: VehicleCheckItem) {
    updateItem(updatedItem);
  }

  function handleOperationalStatusUpdated(updatedItem: VehicleCheckItem) {
    updateItem(updatedItem);
    void businessService.vehicleCheck(params.id).then(setVehicleCheck);
  }

  function updateItem(updatedItem: VehicleCheckItem) {
    setVehicleCheck((current) =>
      current
        ? {
            ...current,
            items: current.items?.map((item) =>
              item.id === updatedItem.id
                ? { ...item, ...updatedItem }
                : item,
            ),
          }
        : current,
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!vehicleCheck) {
    return <PageHeader title="Controle introuvable" description="Impossible de charger ce controle." />;
  }

  const formattedLicensePlate = formatLicensePlate(vehicleCheck.licensePlate, vehicleCheck.licensePlateCountry, vehicleCheck.licensePlateRaw);
  const collaboratorName = vehicleCheck.collaborator ? `${vehicleCheck.collaborator.firstName} ${vehicleCheck.collaborator.lastName}` : "-";
  const agencyName = formatAgencyName(vehicleCheck.agency?.name);
  const repairCount = vehicleCheck.items?.length ?? 0;
  const selectedRepairCount = (vehicleCheck.items ?? []).filter((item) => item.selectedForSummary).length;
  const externalRepairCount = (vehicleCheck.items ?? []).filter(
    (item) => item.selectedForSummary && item.operationalStatus === "ACTIVE" && item.executionMode === "EXTERNAL_PROVIDER",
  ).length;
  const pendingOnSiteRepairCount = (vehicleCheck.items ?? []).filter(
    (item) =>
      item.selectedForSummary &&
      item.operationalStatus === "ACTIVE" &&
      item.executionMode === "ON_SITE" &&
      !item.executionCompletedAt,
  ).length;
  const pendingPartOrderCount = (vehicleCheck.items ?? []).filter(
    (item) =>
      item.selectedForSummary &&
      item.operationalStatus === "ACTIVE" &&
      item.partOrderRequired &&
      item.partOrderStatus === "TO_ORDER",
  ).length;
  const hasPendingProviderDeposit =
    externalRepairCount > 0 && !vehicleCheck.publicShare?.takenInChargeAt;
  const hasPendingVehicleRecovery =
    externalRepairCount > 0 &&
    Boolean(vehicleCheck.publicShare?.takenInChargeAt) &&
    !vehicleCheck.publicShare?.vehicleRecoveredAt;
  const hasPendingInterventionActions =
    pendingPartOrderCount > 0 ||
    pendingOnSiteRepairCount > 0 ||
    hasPendingProviderDeposit ||
    hasPendingVehicleRecovery;
  const hasDetailsComment = Boolean(vehicleCheck.notes?.trim());
  const hasSummaryToPrepare = vehicleCheck.status === "TO_ANALYZE" && !vehicleCheck.summaryFinalizedAt;
  const hasPendingActions =
    hasSummaryToPrepare ||
    (vehicleCheck.status === "SUMMARY_READY" && hasPendingInterventionActions);
  const pendingActionCount = hasSummaryToPrepare
    ? 1
    : Number(pendingPartOrderCount > 0) +
      Number(pendingOnSiteRepairCount > 0) +
      Number(hasPendingProviderDeposit || hasPendingVehicleRecovery);
  const isClosedWithoutDamage = vehicleCheck.status === "CLOSED_NO_DAMAGE";
  const isCompleted = vehicleCheck.status === "COMPLETED";
  const displaysSummary =
    vehicleCheck.status === "TO_ANALYZE" ||
    vehicleCheck.status === "SUMMARY_READY" ||
    isClosedWithoutDamage ||
    isCompleted;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/vehicle-checks">
            <ChevronLeft className="h-4 w-4" />
            Retour aux controles
          </Link>
        </Button>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-gray-500">{vehicleCheck.checkNumber}</p>
              <VehicleCheckStatusBadge
                items={vehicleCheck.items}
                publicShare={vehicleCheck.publicShare}
                status={vehicleCheck.status}
                workflowStage
              />
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <h1 className="text-3xl font-semibold tracking-normal text-gray-950">{formattedLicensePlate}</h1>
              <p className="text-base text-gray-600">
                {vehicleCheck.manufacturer?.name ?? "Constructeur non precise"}
                {vehicleCheck.vehicleModel?.name ? ` · ${vehicleCheck.vehicleModel.name}` : ""}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <QuickInfo label="Date" value={formatDate(vehicleCheck.checkDate)} />
              <QuickInfo label="Agence" value={agencyName} />
            </div>
          </div>
          <VehicleCheckActions vehicleCheck={vehicleCheck} onUpdated={setVehicleCheck} />
        </div>

        <VehicleProgressStepper vehicleCheck={vehicleCheck} />
        <VehicleCheckTimingSummary vehicleCheck={vehicleCheck} />

        {hasPendingActions ? (
          <section className="border-y border-teal-900/10 bg-gray-50">
            <div className="flex flex-col gap-3 bg-gradient-to-r from-teal-900 to-teal-800 px-5 py-2.5 text-white sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/60 bg-white/10 text-white shadow-sm">
                  <CheckSquare2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Actions à effectuer</h2>
                  <p className="text-xs text-teal-50/90">Suivez les prochaines étapes du dossier</p>
                </div>
              </div>
              <p className="w-fit shrink-0 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10">
                {pendingActionCount} action{pendingActionCount > 1 ? "s" : ""} restante{pendingActionCount > 1 ? "s" : ""}
              </p>
            </div>
            <div className="relative divide-y divide-gray-200">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-7 left-[2.375rem] top-7 z-10 border-l border-dashed border-gray-300"
              />
              {hasSummaryToPrepare ? <SummaryPendingStatus /> : null}
              {vehicleCheck.status === "SUMMARY_READY" ? (
                <>
                  {pendingPartOrderCount ? <PartOrderStatus count={pendingPartOrderCount} /> : null}
                  {pendingOnSiteRepairCount ? (
                    <OnSiteRepairStatus vehicleCheck={vehicleCheck} />
                  ) : null}
                  {hasPendingProviderDeposit || hasPendingVehicleRecovery ? (
                    <RepairRequestStatus
                      pendingPartOrderCount={pendingPartOrderCount}
                      vehicleCheck={vehicleCheck}
                      onRecoverVehicle={() => setRecoveredDialogOpen(true)}
                      onSendRepairRequest={() => setEmailDialogOpen(true)}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        {isClosedWithoutDamage ? (
          <div className="border-t border-gray-200 px-5 py-4">
            <NoDamageClosureStatus />
          </div>
        ) : null}

        <details className="group border-t border-gray-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-500">
            <span>Informations du dossier</span>
            <span className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm transition group-hover:border-gray-400 group-hover:text-gray-950">
              <span className="group-open:hidden">Afficher</span>
              <span className="hidden group-open:inline">Masquer</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
            </span>
          </summary>
          <div className="grid border-t border-gray-200 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem icon={CalendarDays} label="Date du controle" value={formatDate(vehicleCheck.checkDate)} />
            <DetailItem icon={Building2} label="Agence" value={agencyName} />
            <DetailItem icon={MapPin} label="Ville" value={vehicleCheck.city || "-"} />
            <DetailItem icon={UserRound} label="Controle par" value={collaboratorName} />
          </div>

          <div className="grid border-t border-gray-200 sm:grid-cols-3">
            <Metric className="text-teal-700" label="Economie reference" value={formatMoney(vehicleCheck.totalInternalSavingAmount)} />
            <Metric label="Franchise constructeur" value={formatMoney(vehicleCheck.constructorAllowanceAmount)} />
            <Metric label="Reparations retenues" value={`${selectedRepairCount}/${repairCount}`} />
          </div>

          {hasDetailsComment ? (
            <div className="space-y-4 border-t border-gray-200 px-5 py-4">
              {vehicleCheck.notes?.trim() ? <CommentBlock label="Commentaire du controle" value={vehicleCheck.notes} /> : null}
            </div>
          ) : null}
        </details>
      </section>

      {displaysSummary ? <VehicleCheckSummarySelection key={vehicleCheck.id} vehicleCheck={vehicleCheck} onUpdated={setVehicleCheck} /> : null}

      {!displaysSummary ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-950">Reparations observees</h2>
              <p className="text-sm text-gray-500">
                {repairCount ? `${repairCount} reparation${repairCount > 1 ? "s" : ""} · Cliquez sur une ligne pour la mettre a jour.` : "Aucune reparation renseignee."}
              </p>
            </div>
          </div>
          <RepairItemsTable vehicleCheck={vehicleCheck} onOperationalStatusUpdated={handleOperationalStatusUpdated} onPartOrderUpdated={handlePartOrderUpdated} />
        </section>
      ) : null}

      {vehicleCheck.status === "SUMMARY_READY" && externalRepairCount > 0 ? (
        <RepairRequestEmailDialog open={emailDialogOpen} vehicleCheck={vehicleCheck} onOpenChange={setEmailDialogOpen} onSent={setVehicleCheck} />
      ) : null}
      <VehicleRecoveredDialog
        open={recoveredDialogOpen}
        vehicleCheck={vehicleCheck}
        onOpenChange={setRecoveredDialogOpen}
        onRecovered={setVehicleCheck}
      />
    </>
  );
}

function VehicleProgressStepper({ vehicleCheck }: { vehicleCheck: VehicleCheck }) {
  const isClosedWithoutDamage = vehicleCheck.status === "CLOSED_NO_DAMAGE";
  const isCompleted = vehicleCheck.status === "COMPLETED";
  const isFieldDone = vehicleCheck.status !== "DRAFT" || Boolean(vehicleCheck.fieldCompletedAt);
  const isSummaryDone =
    vehicleCheck.status === "SUMMARY_READY" ||
    isClosedWithoutDamage ||
    isCompleted ||
    Boolean(vehicleCheck.summaryFinalizedAt);
  const isWithProvider =
    isCompleted || Boolean(vehicleCheck.publicShare?.takenInChargeAt);
  const isRecovered = isCompleted || Boolean(vehicleCheck.publicShare?.vehicleRecoveredAt);
  const selectedItems = (vehicleCheck.items ?? []).filter(
    (item) => item.selectedForSummary && item.operationalStatus === "ACTIVE",
  );
  const onSiteItems = selectedItems.filter((item) => item.executionMode === "ON_SITE");
  const onSiteCount = onSiteItems.length;
  const onSiteDoneCount = onSiteItems.filter((item) => Boolean(item.executionCompletedAt)).length;
  const externalCount = selectedItems.filter((item) => item.executionMode === "EXTERNAL_PROVIDER").length;
  const hasExternalRepairs = externalCount > 0;
  type InterventionBranch = {
    detail?: string;
    label: string;
    status: string;
    tone?: "info" | "success" | "warning";
  };
  const providerName = vehicleCheck.publicShare?.externalRepairContact
    ? externalRepairContactLabel(vehicleCheck.publicShare.externalRepairContact)
    : "";
  const providerDepositStatus = isRecovered
    ? "Véhicule récupéré"
    : isWithProvider
      ? "Dépôt confirmé"
      : "Dépôt non confirmé";
  const providerDepositTone: InterventionBranch["tone"] = isWithProvider ? "success" : "warning";
  const interventionBranches: InterventionBranch[] | undefined =
    !isClosedWithoutDamage && isSummaryDone
      ? [
          {
            label: "Sur place",
            status: onSiteCount
              ? `${onSiteDoneCount}/${onSiteCount} terminée${onSiteCount > 1 ? "s" : ""}`
              : "Aucune",
            tone: onSiteCount
              ? onSiteDoneCount === onSiteCount
                ? "success"
                : "warning"
              : undefined,
          },
          {
            detail: providerName || "Prestataire non renseigné",
            label: "Chez prestataire",
            status: externalCount
              ? `${externalCount} réparation${externalCount > 1 ? "s" : ""} · ${providerDepositStatus}`
              : "Aucune",
            tone: externalCount ? providerDepositTone : undefined,
          },
        ]
      : undefined;
  const steps: Array<{
    branches?: InterventionBranch[];
    completed: boolean;
    descriptionLines: string[];
    label: string;
    skipped?: boolean;
  }> = [
    {
      completed: isFieldDone,
      descriptionLines: [isFieldDone ? "Termine" : "En cours"],
      label: "Controle",
    },
    {
      completed: isSummaryDone,
      descriptionLines: [
        isClosedWithoutDamage
          ? "Aucune reparation retenue"
          : isSummaryDone
            ? "Validee"
            : isFieldDone
              ? "A realiser"
              : "En attente",
      ],
      label: "Synthese",
    },
    {
      branches: interventionBranches,
      completed: isClosedWithoutDamage || isCompleted,
      descriptionLines: [isClosedWithoutDamage ? "Non requis" : "En attente"],
      label: "Interventions",
      skipped: isClosedWithoutDamage,
    },
    {
      completed: isClosedWithoutDamage || !hasExternalRepairs || isRecovered,
      descriptionLines: [
        isClosedWithoutDamage
          ? "Non applicable"
          : !hasExternalRepairs
            ? "Non applicable"
            : isRecovered
              ? "Recupere"
              : isWithProvider
                ? "A recuperer"
                : "En attente",
      ],
      label: "Recuperation",
      skipped: isClosedWithoutDamage || !hasExternalRepairs,
    },
  ];
  const completedCount = steps.filter((step) => step.completed).length;
  const firstIncompleteStepIndex = steps.findIndex((step) => !step.completed);
  const normalizedCurrentStepIndex = firstIncompleteStepIndex === -1 ? steps.length - 1 : firstIncompleteStepIndex;
  const currentStep = steps[normalizedCurrentStepIndex];
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const stepCircleClassName = (step: (typeof steps)[number], index: number) => {
    const isCurrent = index === normalizedCurrentStepIndex && !step.completed;
    return step.skipped
      ? "border-gray-200 bg-gray-100 text-gray-500"
      : step.completed
        ? "bg-teal-700 text-white"
        : isCurrent
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-gray-200 bg-white text-gray-400";
  };
  const stepLabelClassName = (step: (typeof steps)[number], index: number) => {
    const isCurrent = index === normalizedCurrentStepIndex && !step.completed;
    return step.skipped
      ? "text-gray-500"
      : step.completed
        ? "text-gray-950"
        : isCurrent
          ? "text-amber-800"
          : "text-gray-500";
  };
  const desktopStepPositions = ["8%", "35%", "50%", "92%"];

  return (
    <div className="border-t border-gray-200 px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-950">Avancement du dossier</p>
          <p className="text-xs text-gray-500">
            {isClosedWithoutDamage
              ? "Dossier termine · Vehicule reste en station"
              : isCompleted
                ? "Dossier termine · Vehicule recupere"
              : `Etape actuelle : ${currentStep.label}`}
          </p>
        </div>
        <p className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">{progressPercent}%</p>
      </div>
      <div className="relative lg:hidden">
        <div className="relative grid gap-3">
          {steps.map((step, index) => (
            <div className="flex min-w-0 items-start gap-2" key={step.label}>
              <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${stepCircleClassName(step, index)}`}>
                {step.skipped ? (
                  <Minus className="h-4 w-4" />
                ) : step.completed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="min-w-0">
                <p className={`truncate text-xs font-semibold ${stepLabelClassName(step, index)}`}>{step.label}</p>
                {step.branches?.length ? (
                  <div className="relative mt-2 space-y-2 pl-4 text-left">
                    <span className="absolute bottom-2 left-0 top-2 w-px bg-gray-300" aria-hidden="true" />
                    {step.branches.map((branch) => (
                      <div
                        className={[
                          "relative rounded-md border px-2.5 py-1.5",
                          branch.tone === "success"
                            ? "border-emerald-300 bg-emerald-50"
                            : branch.tone === "warning"
                              ? "border-amber-300 bg-amber-50"
                              : branch.tone === "info"
                                ? "border-blue-300 bg-blue-50"
                                : "border-gray-200 bg-gray-50",
                        ].join(" ")}
                        key={branch.label}
                      >
                        <span className="absolute -left-4 top-2 h-px w-3 bg-gray-300" aria-hidden="true" />
                        <p className="whitespace-nowrap text-xs font-semibold text-gray-800">{branch.label}</p>
                        {branch.detail ? <p className="max-w-56 truncate text-[11px] text-gray-500">{branch.detail}</p> : null}
                        <p
                          className={[
                            "mt-0.5 max-w-56 text-[11px] font-medium",
                            branch.tone === "success"
                              ? "text-emerald-800"
                              : branch.tone === "warning"
                                ? "text-amber-900"
                                : branch.tone === "info"
                                  ? "text-blue-800"
                                  : "text-gray-500",
                          ].join(" ")}
                        >
                          {branch.status}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-0.5 space-y-0.5">
                    {step.descriptionLines.map((descriptionLine) => (
                      <p className="whitespace-nowrap text-xs text-gray-500" key={descriptionLine}>{descriptionLine}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {interventionBranches?.length ? (
        <div className="relative hidden min-h-36 lg:block">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-32 w-full overflow-visible"
            preserveAspectRatio="none"
            viewBox="0 0 100 128"
          >
            <path d="M 2 60 H 58" fill="none" stroke="#0f766e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <path
              d="M 58 60 V 28 H 80 V 60"
              fill="none"
              stroke={onSiteCount ? (onSiteDoneCount === onSiteCount ? "#0f766e" : "#f59e0b") : "#d1d5db"}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M 58 60 V 92 H 80 V 60"
              fill="none"
              stroke={externalCount ? (isWithProvider ? "#0f766e" : "#f59e0b") : "#d1d5db"}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M 80 60 H 98"
              fill="none"
              stroke={isRecovered ? "#0f766e" : isWithProvider ? "#f59e0b" : "#d1d5db"}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {steps.map((step, index) => (
            <div
              className="absolute top-11 z-10 flex -translate-x-1/2 flex-col items-center text-center"
              key={step.label}
              style={{ left: desktopStepPositions[index] }}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${stepCircleClassName(step, index)}`}>
                {step.skipped ? (
                  <Minus className="h-4 w-4" />
                ) : step.completed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="mt-1 min-w-0">
                <p className={`whitespace-nowrap text-xs font-semibold ${stepLabelClassName(step, index)}`}>{step.label}</p>
                {index !== 2 ? (
                  <div className="mt-0.5">
                    {step.descriptionLines.map((descriptionLine) => (
                      <p className="whitespace-nowrap text-xs text-gray-500" key={descriptionLine}>{descriptionLine}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {interventionBranches.map((branch, branchIndex) => (
            <div
              className={[
                "absolute left-[69%] z-20 min-w-40 max-w-56 -translate-x-1/2 -translate-y-1/2 rounded-md border px-3 py-1.5 text-left shadow-sm",
                branch.tone === "success"
                  ? "border-emerald-300 bg-emerald-50 shadow-emerald-100"
                  : branch.tone === "warning"
                    ? "border-amber-300 bg-amber-50 shadow-amber-100"
                    : branch.tone === "info"
                      ? "border-blue-300 bg-blue-50 shadow-blue-100"
                      : "border-gray-200 bg-white",
              ].join(" ")}
              key={branch.label}
              style={{ top: branchIndex === 0 ? 28 : 92 }}
            >
              <p className="whitespace-nowrap text-xs font-semibold text-gray-800">{branch.label}</p>
              {branch.detail ? <p className="truncate text-[11px] text-gray-500">{branch.detail}</p> : null}
              <p
                className={[
                  "mt-0.5 text-[11px] font-medium",
                  branch.tone === "success"
                    ? "text-emerald-800"
                    : branch.tone === "warning"
                      ? "text-amber-900"
                      : branch.tone === "info"
                        ? "text-blue-800"
                        : "text-gray-500",
                ].join(" ")}
              >
                {branch.status}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative hidden lg:block">
          <div className="absolute left-4 right-4 top-4 h-px bg-gray-200" />
          <div className="relative grid grid-cols-4 gap-3">
            {steps.map((step, index) => (
              <div className="flex min-w-0 flex-col items-center text-center" key={step.label}>
                <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${stepCircleClassName(step, index)}`}>
                  {step.skipped ? (
                    <Minus className="h-4 w-4" />
                  ) : step.completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-xs font-semibold ${stepLabelClassName(step, index)}`}>{step.label}</p>
                  <div className="mt-0.5 space-y-0.5">
                    {step.descriptionLines.map((descriptionLine) => (
                      <p className="whitespace-nowrap text-xs text-gray-500" key={descriptionLine}>{descriptionLine}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NoDamageClosureStatus() {
  return (
    <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      <p className="font-semibold">Controle termine</p>
      <p className="mt-0.5">
        Le vehicule est reste en station. Aucun prestataire ni aucune
        recuperation ne sont necessaires.
      </p>
    </div>
  );
}

function OnSiteRepairStatus({ vehicleCheck }: { vehicleCheck: VehicleCheck }) {
  const onSiteItems = (vehicleCheck.items ?? []).filter(
    (item) =>
      item.selectedForSummary &&
      item.operationalStatus === "ACTIVE" &&
      item.executionMode === "ON_SITE",
  );
  const onSiteCount = onSiteItems.length;
  const doneCount = onSiteItems.filter((item) => Boolean(item.executionCompletedAt)).length;
  const isCompleted = vehicleCheck.status === "COMPLETED";
  const allDone = doneCount === onSiteCount;

  if (isCompleted || allDone) {
    return (
      <div className={`${actionCardClassName} flex items-center gap-3`}>
        <span className={actionStepIconClassName("bg-emerald-50 text-emerald-700")}>
          <Wrench className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-gray-950">Sur place</p>
          <p className="text-xs text-gray-600">Interventions réalisées sur place</p>
          <p className={actionStatusClassName("emerald")}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {onSiteCount}/{onSiteCount} terminée{onSiteCount > 1 ? "s" : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={actionCardClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={actionStepIconClassName("bg-amber-50 text-amber-700")}>
            <Wrench className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-950">Sur place</p>
            <p className="text-xs text-gray-600">Interventions à réaliser sur place</p>
            <p className={actionStatusClassName("amber")}>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {doneCount}/{onSiteCount} terminée{onSiteCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button
          className="h-8 w-full shrink-0 px-3 sm:w-auto"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => document.getElementById("summary-selection")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <Wrench className="h-4 w-4" />
          Voir la liste
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PartOrderStatus({ count }: { count: number }) {
  return (
    <div className={actionCardClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={actionStepIconClassName("bg-orange-50 text-orange-600")}>
            <Package className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-950">Pièces</p>
            <p className="text-xs text-gray-600">Commander les pièces nécessaires</p>
            <p className={actionStatusClassName("orange")}>
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              {count} pièce{count > 1 ? "s" : ""} à commander
            </p>
          </div>
        </div>
        <Button
          className="h-8 w-full shrink-0 px-3 sm:w-auto"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => document.getElementById("summary-selection")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <Package className="h-4 w-4" />
          Voir la liste
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function RepairRequestStatus({
  onRecoverVehicle,
  onSendRepairRequest,
  pendingPartOrderCount,
  vehicleCheck,
}: {
  onRecoverVehicle: () => void;
  onSendRepairRequest: () => void;
  pendingPartOrderCount: number;
  vehicleCheck: VehicleCheck;
}) {
  const share = vehicleCheck.publicShare;
  const providerLabel = share?.externalRepairContact ? externalRepairContactLabel(share.externalRepairContact) : null;
  const externalRepairCount = (vehicleCheck.items ?? []).filter(
    (item) =>
      item.selectedForSummary &&
      item.operationalStatus === "ACTIVE" &&
      item.executionMode === "EXTERNAL_PROVIDER",
  ).length;

  if (share?.takenInChargeAt) {
    return (
      <div className={actionCardClassName}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className={actionStepIconClassName("bg-blue-50 text-blue-700")}>
              <CarFront className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-gray-950">Récupération</p>
              <p className="text-xs text-gray-600">
                {providerLabel ? `Récupérer le véhicule chez ${providerLabel}` : "Récupérer le véhicule chez le prestataire"}
              </p>
              <p className={actionStatusClassName(pendingPartOrderCount ? "amber" : "blue")}>
                <span className={`h-1.5 w-1.5 rounded-full ${pendingPartOrderCount ? "bg-amber-500" : "bg-blue-500"}`} />
                {pendingPartOrderCount
                  ? `${pendingPartOrderCount} pièce${pendingPartOrderCount > 1 ? "s" : ""} à commander avant la récupération`
                  : providerLabel
                    ? `Véhicule déposé chez ${providerLabel}`
                    : "Véhicule déposé chez le prestataire"}
              </p>
            </div>
          </div>
          <Button
            className="h-8 w-full shrink-0 px-3 sm:w-auto"
            disabled={pendingPartOrderCount > 0}
            size="sm"
            type="button"
            variant="outline"
            onClick={onRecoverVehicle}
          >
            <CheckCircle2 className="h-4 w-4" />
            Marquer récupéré
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={actionCardClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className={actionStepIconClassName("bg-teal-50 text-teal-700")}>
            <CarFront className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-950">Prestataire</p>
            <p className="text-xs text-gray-600">Coordonner le dépôt avec le prestataire</p>
            <p className={actionStatusClassName("teal")}>
              <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
              Dépôt à confirmer · {externalRepairCount} réparation
              {externalRepairCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button className="h-8 w-full shrink-0 px-3 sm:w-auto" size="sm" type="button" onClick={onSendRepairRequest}>
          <CarFront className="h-4 w-4" />
          Confirmer le dépôt
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SummaryPendingStatus() {
  return (
    <div className={actionCardClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className={actionStepIconClassName("bg-amber-50 text-amber-700")}>
            <CheckSquare2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-950">Synthèse</p>
            <p className="text-xs text-gray-600">Vérifier et valider la sélection des réparations</p>
            <p className={actionStatusClassName("amber")}>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Synthèse à préparer
            </p>
          </div>
        </div>
        <Button
          className="h-8 w-full shrink-0 px-3 sm:w-auto"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => document.getElementById("summary-selection")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <CheckSquare2 className="h-4 w-4" />
          Préparer
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function actionStepIconClassName(toneClassName: string) {
  return `relative z-40 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClassName}`;
}

const actionCardClassName =
  "relative bg-white px-5 py-2.5 text-sm";

function actionStatusClassName(
  tone: "amber" | "blue" | "emerald" | "orange" | "teal",
) {
  const toneClassName = {
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-800",
    emerald: "bg-emerald-50 text-emerald-800",
    orange: "bg-orange-50 text-orange-700",
    teal: "bg-teal-50 text-teal-800",
  }[tone];

  return `mt-1 flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${toneClassName}`;
}

function QuickInfo({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
      <span className="font-semibold text-gray-500">{label}</span>
      <span className="truncate font-medium text-gray-900">{value}</span>
    </span>
  );
}

function formatAgencyName(name: string | null | undefined) {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return "-";
  }

  return trimmedName.replace(/^agence\s+/i, "");
}

function CommentBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{value}</p>
    </div>
  );
}

function externalRepairContactLabel(contact: NonNullable<VehicleCheck["publicShare"]>["externalRepairContact"]) {
  if (!contact) {
    return "";
  }

  return contact.company?.name?.trim() || contact.companyName?.trim() || contact.name;
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof Car; label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-3 border-b border-gray-200 px-5 py-4 last:border-b-0 sm:[&:nth-child(2n)]:border-l lg:border-b-0 lg:border-l lg:first:border-l-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-gray-950" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Metric({ className = "text-gray-950", label, value }: { className?: string; label: string; value: string }) {
  return (
    <div className="border-b border-gray-200 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${className}`}>{value}</p>
    </div>
  );
}
