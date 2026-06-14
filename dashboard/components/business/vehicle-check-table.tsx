import Link from "next/link";
import { Eye, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DecisionBadge, VehicleCheckStatusBadge } from "@/components/business/decision-badge";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatLicensePlate, formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { VehicleCheck, VehicleCheckItem, VehicleCheckItemOperationalStatus } from "@/types/business";

type VehicleCheckTableProps = {
  dateRange?: { dateFrom?: string; dateTo?: string };
  vehicleChecks: VehicleCheck[];
  onDateFilterChange?: (range: { dateFrom?: string; dateTo?: string }) => void;
};

export function VehicleCheckTable({ dateRange, vehicleChecks, onDateFilterChange }: VehicleCheckTableProps) {
  return (
    <DataTable
      data={vehicleChecks}
      initialSort={{ column: "checkDate", direction: "desc" }}
      dateFilter={{
        label: "Date",
        getValue: (check) => check.checkDate,
        mode: onDateFilterChange ? "server" : "client",
        value: dateRange,
        onChange: onDateFilterChange,
      }}
      emptyMessage="Aucun controle pour le moment."
      minWidth={1040}
      columns={[
        {
          id: "checkNumber",
          header: "Numero",
          className: "px-4 py-3 font-medium text-gray-950",
          cell: (check) => (
            <Link
              className="font-semibold text-teal-700 underline-offset-4 hover:underline"
              href={`/dashboard/vehicle-checks/${check.id}`}
            >
              {check.checkNumber}
            </Link>
          ),
          sortValue: (check) => check.checkNumber,
          searchValue: (check) => check.checkNumber,
        },
        {
          id: "checkDate",
          header: "Date",
          cell: (check) => formatDate(check.checkDate),
          sortValue: (check) => new Date(check.checkDate),
          searchValue: (check) => formatDate(check.checkDate),
        },
        {
          id: "licensePlate",
          header: "Vehicule",
          cell: (check) =>
            formatLicensePlate(
              check.licensePlate,
              check.licensePlateCountry,
              check.licensePlateRaw,
            ),
          sortValue: (check) => check.licensePlate,
          searchValue: (check) =>
            `${check.licensePlate} ${check.licensePlateRaw ?? ""} ${formatLicensePlate(
              check.licensePlate,
              check.licensePlateCountry,
              check.licensePlateRaw,
            )}`,
        },
        {
          id: "manufacturer",
          header: "Constructeur",
          cell: (check) => check.manufacturer?.name ?? "-",
          sortValue: (check) => check.manufacturer?.name,
          searchValue: (check) => check.manufacturer?.name,
        },
        {
          id: "city",
          header: "Ville",
          cell: (check) => check.city,
          sortValue: (check) => check.city,
          searchValue: (check) => check.city,
        },
        {
          id: "totalInternalSavingAmount",
          header: "Economie reference",
          cell: (check) => formatMoney(check.totalInternalSavingAmount),
          sortValue: (check) => Number(check.totalInternalSavingAmount),
          searchValue: (check) => check.totalInternalSavingAmount,
        },
        {
          id: "status",
          header: "Statut",
          cell: (check) => <VehicleCheckStatusBadge status={check.status} />,
          sortValue: (check) => check.status,
          searchValue: (check) => check.status,
        },
        {
          id: "partOrders",
          header: "Commandes",
          cell: (check) => <PartOrderSummaryBadge vehicleCheck={check} />,
          sortValue: (check) => partOrderSummary(check).toOrder,
          searchValue: (check) => partOrderSummaryText(check),
        },
        {
          id: "view",
          header: "Voir",
          cell: (check) => (
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/vehicle-checks/${check.id}`}>
                <Eye className="h-4 w-4" />
                Detail
              </Link>
            </Button>
          ),
        },
      ]}
    />
  );
}

export function RepairItemsTable({
  vehicleCheck,
  onOperationalStatusUpdated,
  onPartOrderUpdated,
}: {
  vehicleCheck: VehicleCheck;
  onOperationalStatusUpdated?: (item: VehicleCheckItem) => void;
  onPartOrderUpdated?: (item: VehicleCheckItem) => void;
}) {
  const [selectedItem, setSelectedItem] = useState<VehicleCheckItem | null>(null);
  const selectedCurrentItem = selectedItem
    ? vehicleCheck.items?.find((item) => item.id === selectedItem.id) ?? selectedItem
    : null;
  const canEditOperationalStatus = Boolean(onOperationalStatusUpdated);

  function openItemSheet(item: VehicleCheckItem) {
    if (canEditOperationalStatus) {
      setSelectedItem(item);
    }
  }

  function handleOperationalStatusUpdated(updatedItem: VehicleCheckItem) {
    setSelectedItem(updatedItem);
    onOperationalStatusUpdated?.(updatedItem);
  }

  return (
    <>
      <DataTable
        data={vehicleCheck.items ?? []}
        emptyMessage="Aucune reparation sur ce controle."
        minWidth={1180}
        columns={[
          {
            id: "vehiclePart",
            header: "Element",
            className: "px-4 py-3 font-medium text-gray-950",
            cell: (item) => (
              <RepairItemOpenButton
                canOpen={canEditOperationalStatus}
                label={item.vehiclePart.name}
                onClick={() => openItemSheet(item)}
              />
            ),
            sortValue: (item) => item.vehiclePart.name,
            searchValue: (item) => item.vehiclePart.name,
          },
          {
            id: "repairType",
            header: "Reparation",
            cell: (item) => (
              <RepairItemOpenButton
                canOpen={canEditOperationalStatus}
                label={item.repairType.name}
                onClick={() => openItemSheet(item)}
              />
            ),
            sortValue: (item) => item.repairType.name,
            searchValue: (item) => `${item.repairType.name} ${item.vehiclePart.name}`,
          },
          {
            id: "quantity",
            header: "Quantite",
            cell: (item) => item.quantity,
            sortValue: (item) => item.quantity,
            searchValue: (item) => item.quantity,
          },
          {
            id: "decisionStatus",
            header: "Decision",
            cell: (item) => <DecisionBadge status={item.decisionStatus} />,
            sortValue: (item) => item.decisionStatus,
            searchValue: (item) => item.decisionStatus,
          },
          {
            id: "operationalStatus",
            header: "Statut réparation",
            cell: (item) => (
              <OperationalStatusCell
                item={item}
                onOpen={canEditOperationalStatus ? () => openItemSheet(item) : undefined}
              />
            ),
            sortValue: (item) => item.operationalStatus,
            searchValue: (item) => operationalStatusLabels[item.operationalStatus],
          },
          {
            id: "decisionMessage",
            header: "Message",
            cell: (item) => item.decisionMessage ?? "-",
            sortValue: (item) => item.decisionMessage,
            searchValue: (item) => item.decisionMessage,
          },
          {
            id: "comment",
            header: "Commentaire",
            cell: (item) => (item.comment?.trim() ? item.comment : "-"),
            sortValue: (item) => item.comment,
            searchValue: (item) => item.comment,
          },
          {
            id: "partOrder",
            header: "Commande pièce",
            cell: (item) => (
              <PartOrderCell item={item} onPartOrderUpdated={onPartOrderUpdated} />
            ),
            sortValue: (item) => item.partOrderStatus,
            searchValue: (item) => item.partOrderStatus,
          },
        ]}
      />

      {selectedCurrentItem ? (
        <RepairStatusSheet
          item={selectedCurrentItem}
          onClose={() => setSelectedItem(null)}
          onUpdated={handleOperationalStatusUpdated}
        />
      ) : null}
    </>
  );
}

function PartOrderSummaryBadge({ vehicleCheck }: { vehicleCheck: VehicleCheck }) {
  const summary = partOrderSummary(vehicleCheck);

  if (!summary.required) {
    return <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">Aucune</span>;
  }

  if (summary.toOrder) {
    return (
      <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
        {summary.toOrder} à commander
      </span>
    );
  }

  return (
    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
      Commandées
    </span>
  );
}

function partOrderSummary(vehicleCheck: VehicleCheck) {
  const items = (vehicleCheck.items ?? []).filter((item) => item.operationalStatus === "ACTIVE");
  const required = items.filter((item) => item.partOrderRequired).length;
  const toOrder = items.filter((item) => item.partOrderStatus === "TO_ORDER").length;
  const ordered = items.filter((item) => item.partOrderStatus === "ORDERED").length;

  return { required, toOrder, ordered };
}

function partOrderSummaryText(vehicleCheck: VehicleCheck) {
  const summary = partOrderSummary(vehicleCheck);
  if (!summary.required) return "Aucune commande";
  if (summary.toOrder) return `${summary.toOrder} commande a passer`;
  return `${summary.ordered} commandees`;
}

const operationalStatusLabels: Record<VehicleCheckItemOperationalStatus, string> = {
  ACTIVE: "Prêt réparation",
  IMPOSSIBLE: "Réparation impossible",
  CANCELLED: "Annulé",
};

function OperationalStatusCell({
  item,
  onOpen,
}: {
  item: VehicleCheckItem;
  onOpen?: () => void;
}) {
  if (!onOpen) {
    return <OperationalStatusBadge status={item.operationalStatus} />;
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left shadow-sm transition hover:border-teal-600 hover:bg-teal-50"
      title="Modifier le statut de la réparation"
      type="button"
      onClick={onOpen}
    >
      <OperationalStatusBadge status={item.operationalStatus} />
      <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700">
        <Pencil className="h-3.5 w-3.5" />
        Modifier
      </span>
    </button>
  );
}

function OperationalStatusBadge({ status }: { status: VehicleCheckItemOperationalStatus }) {
  if (status === "IMPOSSIBLE") {
    return (
      <span className="inline-flex rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
        {operationalStatusLabels[status]}
      </span>
    );
  }

  if (status === "CANCELLED") {
    return (
      <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
        {operationalStatusLabels[status]}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
      {operationalStatusLabels[status]}
    </span>
  );
}

function RepairItemOpenButton({
  canOpen,
  label,
  onClick,
}: {
  canOpen: boolean;
  label: string;
  onClick: () => void;
}) {
  if (!canOpen) {
    return label;
  }

  return (
    <button
      className="text-left font-medium text-gray-950 underline-offset-4 hover:text-teal-700 hover:underline"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

const operationalStatusOptions: Array<{
  value: VehicleCheckItemOperationalStatus;
  label: string;
  description: string;
}> = [
  {
    value: "ACTIVE",
    label: operationalStatusLabels.ACTIVE,
    description: "Compte dans les economies, stats et exports.",
  },
  {
    value: "IMPOSSIBLE",
    label: operationalStatusLabels.IMPOSSIBLE,
    description: "Visible dans le detail, hors calculs et hors export.",
  },
  {
    value: "CANCELLED",
    label: operationalStatusLabels.CANCELLED,
    description: "Visible dans le detail, hors calculs et hors export.",
  },
];

function RepairStatusSheet({
  item,
  onClose,
  onUpdated,
}: {
  item: VehicleCheckItem;
  onClose: () => void;
  onUpdated: (item: VehicleCheckItem) => void;
}) {
  const [status, setStatus] = useState<VehicleCheckItemOperationalStatus>(item.operationalStatus);
  const [comment, setComment] = useState(item.operationalComment ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStatus(item.operationalStatus);
    setComment(item.operationalComment ?? "");
  }, [item]);

  async function saveStatus() {
    if (status !== "ACTIVE" && !comment.trim()) {
      toast.error("Ajoute un commentaire pour ce statut.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedItem = await businessService.updateVehicleCheckItemOperationalStatus(item.id, {
        operationalStatus: status,
        operationalComment: comment.trim() || undefined,
      });
      onUpdated(updatedItem);
      toast.success("Statut de la réparation mis à jour.");
    } catch {
      toast.error("Impossible de modifier le statut de la réparation.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 motion-safe:animate-[vehicle-check-sheet-overlay-in_160ms_ease-out] md:items-stretch md:justify-end">
      <div className="max-h-[94vh] w-full overflow-hidden rounded-t-xl bg-white shadow-xl motion-safe:animate-[vehicle-check-sheet-in_220ms_cubic-bezier(0.22,1,0.36,1)] md:h-full md:max-h-none md:max-w-xl md:rounded-none">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 md:px-5">
          <div>
            <h2 className="text-base font-semibold text-gray-950">Détail réparation</h2>
            <p className="mt-1 text-sm text-gray-500">
              {item.vehiclePart.name} · {item.repairType.name}
            </p>
          </div>
          <button
            aria-label="Fermer la fiche reparation"
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(94vh-142px)] overflow-y-auto p-4 md:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-gray-200 p-3">
              <p className="text-xs font-medium uppercase text-gray-500">Element</p>
              <p className="mt-1 font-medium text-gray-950">{item.vehiclePart.name}</p>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <p className="text-xs font-medium uppercase text-gray-500">Reparation</p>
              <p className="mt-1 font-medium text-gray-950">{item.repairType.name}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label>Statut</Label>
            <div className="grid gap-2">
              {operationalStatusOptions.map((option) => {
                const isSelected = status === option.value;

                return (
                  <button
                    className={[
                      "rounded-md border p-3 text-left transition",
                      isSelected
                        ? "border-teal-700 bg-teal-50 text-teal-950"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                    ].join(" ")}
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="mt-1 block text-sm text-gray-500">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label>Commentaire</Label>
            <textarea
              className="min-h-24 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-950 shadow-sm"
              placeholder="Ex: piece indisponible, dommage non reparable, erreur de saisie..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-gray-950">Historique</h3>
            {item.statusHistories?.length ? (
              <div className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
                {item.statusHistories.map((history) => (
                  <div className="p-3 text-sm" key={history.id}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <p className="font-medium text-gray-950">
                        {operationalStatusLabels[history.fromStatus]} → {operationalStatusLabels[history.toStatus]}
                      </p>
                      <p className="text-gray-500">{formatDate(history.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-gray-500">
                      {history.user
                        ? `${history.user.firstName} ${history.user.lastName}`
                        : "Utilisateur inconnu"}
                    </p>
                    {history.comment?.trim() ? (
                      <p className="mt-2 rounded-md bg-gray-50 p-2 text-gray-700">{history.comment}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 rounded-md border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                Aucun changement de statut pour le moment.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-gray-100 bg-white p-3 md:px-5">
          <Button disabled={isSaving} type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button disabled={isSaving} type="button" onClick={saveStatus}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PartOrderCell({
  item,
  onPartOrderUpdated,
}: {
  item: VehicleCheckItem;
  onPartOrderUpdated?: (item: VehicleCheckItem) => void;
}) {
  const [price, setPrice] = useState(item.partOrderPrice ? String(item.partOrderPrice) : "");
  const [reference, setReference] = useState(item.partOrderReference ?? "");
  const [isSaving, setIsSaving] = useState(false);

  if (item.operationalStatus !== "ACTIVE") {
    return <span className="text-gray-500">Hors export</span>;
  }

  if (!item.partOrderRequired) {
    return <span className="text-gray-500">Non</span>;
  }

  if (item.partOrderStatus === "ORDERED") {
    return (
      <div className="space-y-1 text-sm">
        <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
          Commandée
        </span>
        <p className="text-gray-600">{formatMoney(item.partOrderPrice)}</p>
        {item.partOrderReference ? <p className="text-xs text-gray-500">{item.partOrderReference}</p> : null}
      </div>
    );
  }

  if (!onPartOrderUpdated) {
    return (
      <span className="inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
        À commander
      </span>
    );
  }

  async function confirmOrder() {
    const numericPrice = Number(price);
    if (!price || Number.isNaN(numericPrice) || numericPrice < 0) {
      toast.error("Renseigne le prix de la pièce commandée.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedItem = await businessService.updatePartOrder(item.id, {
        partOrderRequired: true,
        partOrderStatus: "ORDERED",
        partOrderPrice: numericPrice,
        partOrderReference: reference || undefined,
      });
      onPartOrderUpdated?.(updatedItem);
      toast.success("Commande pièce confirmée.");
    } catch {
      toast.error("Impossible de confirmer la commande pièce.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-w-52 space-y-2">
      <span className="inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
        À commander
      </span>
      <div className="grid grid-cols-2 gap-2">
        <Input
          className="h-9"
          inputMode="decimal"
          placeholder="Prix"
          type="number"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
        <Input
          className="h-9"
          placeholder="Ref."
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
      </div>
      <Button className="h-9 w-full" disabled={isSaving} size="sm" type="button" onClick={confirmOrder}>
        {isSaving ? "Confirmation..." : "Confirmer commande"}
      </Button>
    </div>
  );
}
