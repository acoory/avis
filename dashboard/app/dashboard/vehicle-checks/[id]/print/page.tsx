"use client";

import Link from "next/link";
import { ChevronLeft, Download } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DecisionBadge, VehicleCheckStatusBadge } from "@/components/business/decision-badge";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatLicensePlate, formatMoney } from "@/lib/format";
import { downloadVehicleCheckPdf } from "@/lib/vehicle-check-pdf";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

export default function VehicleCheckPrintPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [vehicleCheck, setVehicleCheck] = useState<VehicleCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    void businessService
      .vehicleCheck(params.id)
      .then(setVehicleCheck)
      .finally(() => setIsLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!vehicleCheck || searchParams.get("autoprint") !== "1" || hasPrintedRef.current) {
      return;
    }

    hasPrintedRef.current = true;
    window.setTimeout(() => window.print(), 200);
  }, [searchParams, vehicleCheck]);

  const partOrderSummary = useMemo(() => {
    const items = (vehicleCheck?.items ?? []).filter((item) => item.selectedForSummary);
    const required = items.filter((item) => item.partOrderRequired).length;
    const toOrder = items.filter((item) => item.partOrderStatus === "TO_ORDER").length;
    const ordered = items.filter((item) => item.partOrderStatus === "ORDERED").length;

    return { required, toOrder, ordered };
  }, [vehicleCheck?.items]);
  const summaryItems = useMemo(
    () => (vehicleCheck?.items ?? []).filter((item) => item.selectedForSummary),
    [vehicleCheck?.items],
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!vehicleCheck) {
    return <PageHeader title="Controle introuvable" description="Impossible de charger cette synthese." />;
  }

  if (
    vehicleCheck.status !== "SUMMARY_READY" &&
    vehicleCheck.status !== "CLOSED_NO_DAMAGE" &&
    vehicleCheck.status !== "COMPLETED"
  ) {
    return (
      <PageHeader
        title="Synthese non disponible"
        description="Selectionne d'abord les reparations a effectuer depuis le controle."
      />
    );
  }

  async function handleDownload() {
    if (!vehicleCheck) {
      return;
    }

    setIsDownloading(true);
    try {
      await downloadVehicleCheckPdf(vehicleCheck);
      toast.success("PDF telecharge avec succes.");
    } catch {
      toast.error("Impossible de generer le PDF.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[190mm] items-center justify-between gap-3 px-4 py-3">
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/vehicle-checks/${vehicleCheck.id}`}>
              <ChevronLeft className="h-4 w-4" />
              Retour au controle
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button disabled={isDownloading} size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              {isDownloading ? "Generation..." : "Telecharger PDF"}
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto my-6 max-w-[190mm] bg-white p-4 shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b border-gray-200 pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Synthese controle vehicule</p>
              <h1 className="mt-1 text-xl font-semibold text-gray-950">{vehicleCheck.checkNumber}</h1>
              <p className="mt-1 text-sm text-gray-600">
                {formatLicensePlate(
                  vehicleCheck.licensePlate,
                  vehicleCheck.licensePlateCountry,
                  vehicleCheck.licensePlateRaw,
                )} | {vehicleCheck.manufacturer?.name ?? "-"} |{" "}
                {formatDate(vehicleCheck.checkDate)}
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-end">
                <VehicleCheckStatusBadge
                  publicShare={vehicleCheck.publicShare}
                  status={vehicleCheck.status}
                  workflowStage
                />
              </div>
              <p className="text-right text-xs text-gray-600">
                Genere le {formatDate(new Date())}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-3 grid gap-1.5 sm:grid-cols-2">
          <Metric label="Franchise constructeur" value={formatMoney(vehicleCheck.constructorAllowanceAmount)} />
          <Metric
            label="Pieces a commander"
            value={
              !partOrderSummary.required
                ? "Aucune"
                : partOrderSummary.toOrder
                  ? `${partOrderSummary.toOrder} a commander`
                  : `${partOrderSummary.ordered} commandee${partOrderSummary.ordered > 1 ? "s" : ""}`
            }
          />
        </section>

        <section className="mt-4 rounded-lg border border-gray-200 px-3 py-2.5">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Informations vehicule et controle
          </h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-3">
            <CompactField label="Agence" value={vehicleCheck.agency?.name ?? "-"} />
            <CompactField
              label="Collaborateur"
              value={
                vehicleCheck.collaborator
                  ? `${vehicleCheck.collaborator.firstName} ${vehicleCheck.collaborator.lastName}`
                  : "-"
              }
            />
            <CompactField label="Modele" value={vehicleCheck.vehicleModel?.name ?? "Non precise"} />
            <CompactField label="Kilometrage" value={vehicleCheck.mileage ? `${vehicleCheck.mileage} km` : "-"} />
            <CompactField label="Ville" value={vehicleCheck.city} />
          </div>
        </section>

        <section className="mt-4">
          <SectionTitle title="Travaux selectionnes" />
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {summaryItems.length
              ? `${summaryItems.length} reparation(s) retenue(s) pour la demande de devis.`
              : "Aucune reparation retenue."}
          </div>
        </section>

        <section className="mt-4">
          <SectionTitle title="Reparations a chiffrer" />
          {summaryItems.length ? (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Element</th>
                    <th className="px-4 py-3 font-medium">Reparation</th>
                    <th className="px-4 py-3 font-medium">Decision</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {summaryItems.map((item) => (
                    <tr className="align-top" key={item.id}>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-950">{item.vehiclePart.name}</p>
                        {item.vehiclePart.category ? (
                          <p className="mt-1 text-xs text-gray-500">{item.vehiclePart.category.toLowerCase()}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-950">{item.repairType.name}</p>
                        <p className="mt-1 text-xs text-gray-500">Quantite : {item.quantity}</p>
                      </td>
                      <td className="px-4 py-4">
                        <DecisionBadge status={item.decisionStatus} />
                      </td>
                      <td className="space-y-2 px-4 py-4 text-gray-700">
                        <p>{item.decisionMessage?.trim() ? item.decisionMessage : "-"}</p>
                        <p className="text-xs text-gray-500">
                          Commentaire : {item.comment?.trim() ? item.comment : "Aucun"}
                        </p>
                        <PartOrderBadge item={item} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Aucune reparation selectionnee pour ce vehicule.
            </div>
          )}
        </section>

        <section className="mt-4">
          <SectionTitle title="Observations" />
          <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
            {vehicleCheck.notes?.trim() ? (
              <p className="whitespace-pre-wrap">{vehicleCheck.notes}</p>
            ) : (
              <p>Aucune observation complementaire.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-2 text-base font-semibold text-gray-950">{title}</h2>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-gray-950">{value}</p>
    </div>
  );
}

function CompactField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="truncate text-[13px] font-medium leading-4 text-gray-950">{value}</p>
    </div>
  );
}

function PartOrderBadge({ item }: { item: NonNullable<VehicleCheck["items"]>[number] }) {
  if (!item.partOrderRequired) {
    return <Badge variant="outline">Pas de commande piece</Badge>;
  }

  if (item.partOrderStatus === "ORDERED") {
    return <Badge variant="success">Piece commandee</Badge>;
  }

  return <Badge variant="warning">Piece a commander</Badge>;
}
