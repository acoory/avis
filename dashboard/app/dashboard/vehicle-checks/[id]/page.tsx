"use client";

import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Car,
  CheckCircle2,
  CheckSquare2,
  ChevronDown,
  ChevronLeft,
  Mail,
  MapPin,
  UserRound,
  Wrench,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RepairRequestEmailDialog } from "@/components/business/repair-request-email-dialog";
import { VehicleCheckActions } from "@/components/business/vehicle-check-actions";
import { VehicleCheckStatusBadge } from "@/components/business/decision-badge";
import { RepairItemsTable } from "@/components/business/vehicle-check-table";
import { VehicleCheckSummarySelection } from "@/components/business/vehicle-check-summary-selection";
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
              item.id === updatedItem.id ? updatedItem : item,
            ),
          }
        : current,
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!vehicleCheck) {
    return (
      <PageHeader
        title="Controle introuvable"
        description="Impossible de charger ce controle."
      />
    );
  }

  const formattedLicensePlate = formatLicensePlate(
    vehicleCheck.licensePlate,
    vehicleCheck.licensePlateCountry,
    vehicleCheck.licensePlateRaw,
  );
  const collaboratorName = vehicleCheck.collaborator
    ? `${vehicleCheck.collaborator.firstName} ${vehicleCheck.collaborator.lastName}`
    : "-";
  const agencyName = formatAgencyName(vehicleCheck.agency?.name);
  const repairCount = vehicleCheck.items?.length ?? 0;
  const selectedRepairCount = (vehicleCheck.items ?? []).filter(
    (item) => item.selectedForSummary,
  ).length;
  const hasDetailsComment = Boolean(vehicleCheck.notes?.trim());
  const hasSummaryToPrepare =
    vehicleCheck.status === "TO_ANALYZE" && !vehicleCheck.summaryFinalizedAt;
  const displaysSummary =
    vehicleCheck.status === "TO_ANALYZE" ||
    vehicleCheck.status === "SUMMARY_READY";

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
              <p className="text-sm font-medium text-gray-500">
                {vehicleCheck.checkNumber}
              </p>
              <VehicleCheckStatusBadge status={vehicleCheck.status} />
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <h1 className="text-3xl font-semibold tracking-normal text-gray-950">
                {formattedLicensePlate}
              </h1>
              <p className="text-base text-gray-600">
                {vehicleCheck.manufacturer?.name ?? "Constructeur non precise"}
                {vehicleCheck.vehicleModel?.name
                  ? ` · ${vehicleCheck.vehicleModel.name}`
                  : ""}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <QuickInfo
                label="Date"
                value={formatDate(vehicleCheck.checkDate)}
              />
              <QuickInfo label="Agence" value={agencyName} />
            </div>
          </div>
          <VehicleCheckActions
            vehicleCheck={vehicleCheck}
            onSendRepairRequest={() => setEmailDialogOpen(true)}
            onUpdated={setVehicleCheck}
          />
        </div>

        <VehicleProgressStepper vehicleCheck={vehicleCheck} />

        {hasSummaryToPrepare ? (
          <div className="border-t border-gray-200 px-5 py-4">
            <SummaryPendingStatus />
          </div>
        ) : null}

        {vehicleCheck.status === "SUMMARY_READY" ? (
          <div className="border-t border-gray-200 px-5 py-4">
            <RepairRequestStatus
              vehicleCheck={vehicleCheck}
              onSendRepairRequest={() => setEmailDialogOpen(true)}
            />
          </div>
        ) : null}

        <details className="group border-t border-gray-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-semibold text-gray-900">
            Informations du dossier
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </summary>
          <div className="grid border-t border-gray-200 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem
              icon={CalendarDays}
              label="Date du controle"
              value={formatDate(vehicleCheck.checkDate)}
            />
            <DetailItem icon={Building2} label="Agence" value={agencyName} />
            <DetailItem
              icon={MapPin}
              label="Ville"
              value={vehicleCheck.city || "-"}
            />
            <DetailItem
              icon={UserRound}
              label="Controle par"
              value={collaboratorName}
            />
          </div>

          <div className="grid border-t border-gray-200 sm:grid-cols-3">
            <Metric
              className="text-teal-700"
              label="Economie reference"
              value={formatMoney(vehicleCheck.totalInternalSavingAmount)}
            />
            <Metric
              label="Franchise constructeur"
              value={formatMoney(vehicleCheck.constructorAllowanceAmount)}
            />
            <Metric
              label="Reparations retenues"
              value={`${selectedRepairCount}/${repairCount}`}
            />
          </div>

          {hasDetailsComment ? (
            <div className="space-y-4 border-t border-gray-200 px-5 py-4">
              {vehicleCheck.notes?.trim() ? (
                <CommentBlock
                  label="Commentaire du controle"
                  value={vehicleCheck.notes}
                />
              ) : null}
            </div>
          ) : null}
        </details>
      </section>

      {displaysSummary ? (
        <VehicleCheckSummarySelection
          vehicleCheck={vehicleCheck}
          onUpdated={setVehicleCheck}
        />
      ) : null}

      {!displaysSummary ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-950">
                Reparations observees
              </h2>
              <p className="text-sm text-gray-500">
                {repairCount
                  ? `${repairCount} reparation${repairCount > 1 ? "s" : ""} · Cliquez sur une ligne pour la mettre a jour.`
                  : "Aucune reparation renseignee."}
              </p>
            </div>
          </div>
          <RepairItemsTable
            vehicleCheck={vehicleCheck}
            onOperationalStatusUpdated={handleOperationalStatusUpdated}
            onPartOrderUpdated={handlePartOrderUpdated}
          />
        </section>
      ) : null}

      {vehicleCheck.status === "SUMMARY_READY" ? (
        <RepairRequestEmailDialog
          open={emailDialogOpen}
          vehicleCheck={vehicleCheck}
          onOpenChange={setEmailDialogOpen}
          onSent={setVehicleCheck}
        />
      ) : null}
    </>
  );
}

function VehicleProgressStepper({
  vehicleCheck,
}: {
  vehicleCheck: VehicleCheck;
}) {
  const isFieldDone =
    vehicleCheck.status !== "DRAFT" || Boolean(vehicleCheck.fieldCompletedAt);
  const isSummaryDone =
    vehicleCheck.status === "SUMMARY_READY" ||
    Boolean(vehicleCheck.summaryFinalizedAt);
  const isWithProvider = Boolean(vehicleCheck.publicShare);
  const isRecovered = Boolean(vehicleCheck.publicShare?.vehicleRecoveredAt);
  const steps = [
    {
      completed: isFieldDone,
      description: isFieldDone ? "Termine" : "En cours",
      label: "Controle",
    },
    {
      completed: isSummaryDone,
      description: isSummaryDone
        ? "Validee"
        : isFieldDone
          ? "A realiser"
          : "En attente",
      label: "Synthese",
    },
    {
      completed: isWithProvider,
      description: isWithProvider
        ? "Chez prestataire"
        : isSummaryDone
          ? "A envoyer"
          : "En attente",
      label: "Prestataire",
    },
    {
      completed: isRecovered,
      description: isRecovered
        ? "Recupere"
        : isWithProvider
          ? "A recuperer"
          : "En attente",
      label: "Recuperation",
    },
  ];
  const completedCount = steps.filter((step) => step.completed).length;
  const firstIncompleteStepIndex = steps.findIndex((step) => !step.completed);
  const normalizedCurrentStepIndex =
    firstIncompleteStepIndex === -1
      ? steps.length - 1
      : firstIncompleteStepIndex;
  const currentStep = steps[normalizedCurrentStepIndex];
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="border-t border-gray-200 px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-950">
            Avancement du dossier
          </p>
          <p className="text-xs text-gray-500">
            Etape actuelle : {currentStep.label}
          </p>
        </div>
        <p className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
          {progressPercent}%
        </p>
      </div>
      <div className="relative">
        <div className="absolute left-4 right-4 top-4 hidden h-px bg-gray-200 md:block" />
        <div className="relative grid gap-3 md:grid-cols-4">
          {steps.map((step, index) => {
            const isCurrent =
              index === normalizedCurrentStepIndex && !step.completed;
            const circleClassName = step.completed
              ? "bg-teal-700 text-white"
              : isCurrent
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-gray-200 bg-white text-gray-400";
            const labelClassName = step.completed
              ? "text-gray-950"
              : isCurrent
                ? "text-amber-800"
                : "text-gray-500";

            return (
              <div
                className="flex min-w-0 items-start gap-2 md:flex-col md:items-center md:text-center"
                key={step.label}
              >
                <div
                  className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${circleClassName}`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={`truncate text-xs font-semibold ${labelClassName}`}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RepairRequestStatus({
  onSendRepairRequest,
  vehicleCheck,
}: {
  onSendRepairRequest: () => void;
  vehicleCheck: VehicleCheck;
}) {
  const share = vehicleCheck.publicShare;
  const providerLabel = share?.externalRepairContact
    ? externalRepairContactLabel(share.externalRepairContact)
    : null;

  if (share?.vehicleRecoveredAt) {
    return (
      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
        <p className="font-semibold">Vehicule recupere</p>
        <p className="mt-0.5">
          {providerLabel
            ? `Le vehicule a ete recupere chez ${providerLabel}.`
            : "Le vehicule a ete recupere."}
        </p>
      </div>
    );
  }

  if (share) {
    return (
      <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <p className="font-semibold">
          {providerLabel
            ? `Vehicule chez ${providerLabel}`
            : "Vehicule chez le prestataire"}
        </p>
        <p className="mt-0.5">
          La demande de devis a ete envoyee au prestataire.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-teal-100 bg-teal-50/80 p-3 text-sm text-teal-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-teal-700 shadow-sm ring-1 ring-teal-100">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-5">
              Demande de devis prestataire
            </p>
            <p className="mt-1 leading-5 text-teal-800">
              La synthese est prete. Envoyez le dossier a l&apos;entreprise et
              aux destinataires concernes.
            </p>
          </div>
        </div>
        <Button
          className="w-full shrink-0 bg-teal-700 text-white hover:bg-teal-800 sm:w-auto"
          size="sm"
          type="button"
          onClick={onSendRepairRequest}
        >
          <Mail className="h-4 w-4" />
          Envoyer
        </Button>
      </div>
    </div>
  );
}

function SummaryPendingStatus() {
  return (
    <div className="rounded-md border border-amber-100 bg-amber-50/80 p-3 text-sm text-amber-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-amber-700 shadow-sm ring-1 ring-amber-100">
            <CheckSquare2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-5">Synthese a realiser</p>
            <p className="mt-1 leading-5 text-amber-800">
              Les reparations sont preselectionnees. Verifiez la selection, puis
              validez la synthese.
            </p>
          </div>
        </div>
        <Button
          className="w-full shrink-0 border-amber-200 bg-white text-amber-800 hover:bg-amber-100 sm:w-auto"
          size="sm"
          type="button"
          variant="outline"
          onClick={() =>
            document
              .getElementById("summary-selection")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <CheckSquare2 className="h-4 w-4" />
          Preparer
        </Button>
      </div>
    </div>
  );
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
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
        {value}
      </p>
    </div>
  );
}

function externalRepairContactLabel(
  contact: NonNullable<VehicleCheck["publicShare"]>["externalRepairContact"],
) {
  if (!contact) {
    return "";
  }

  return (
    contact.company?.name?.trim() || contact.companyName?.trim() || contact.name
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Car;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 border-b border-gray-200 px-5 py-4 last:border-b-0 sm:[&:nth-child(2n)]:border-l lg:border-b-0 lg:border-l lg:first:border-l-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
        <p
          className="mt-1 truncate text-sm font-medium text-gray-950"
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Metric({
  className = "text-gray-950",
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-gray-200 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${className}`}>{value}</p>
    </div>
  );
}
