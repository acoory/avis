import Link from "next/link";
import { Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DecisionBadge, VehicleCheckStatusBadge } from "@/components/business/decision-badge";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatLicensePlate, formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { VehicleCheck, VehicleCheckItem } from "@/types/business";

type VehicleCheckTableProps = {
  vehicleChecks: VehicleCheck[];
  onDateFilterChange?: (range: { dateFrom?: string; dateTo?: string }) => void;
};

export function VehicleCheckTable({ vehicleChecks, onDateFilterChange }: VehicleCheckTableProps) {
  return (
    <DataTable
      data={vehicleChecks}
      dateFilter={{
        label: "Date",
        getValue: (check) => check.checkDate,
        mode: onDateFilterChange ? "server" : "client",
        onChange: onDateFilterChange,
      }}
      emptyMessage="Aucun controle pour le moment."
      minWidth={1180}
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
          cell: (check) => formatLicensePlate(check.licensePlate),
          sortValue: (check) => check.licensePlate,
          searchValue: (check) => `${check.licensePlate} ${formatLicensePlate(check.licensePlate)}`,
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
          header: "Economie",
          cell: (check) => formatMoney(check.totalInternalSavingAmount),
          sortValue: (check) => Number(check.totalInternalSavingAmount),
          searchValue: (check) => check.totalInternalSavingAmount,
        },
        {
          id: "totalInternalCost",
          header: "Cout interne",
          cell: (check) => formatMoney(check.totalInternalCost),
          sortValue: (check) => Number(check.totalInternalCost),
          searchValue: (check) => check.totalInternalCost,
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
  onPartOrderUpdated,
}: {
  vehicleCheck: VehicleCheck;
  onPartOrderUpdated?: (item: VehicleCheckItem) => void;
}) {
  return (
    <DataTable
      data={vehicleCheck.items ?? []}
      emptyMessage="Aucune reparation sur ce controle."
      minWidth={1180}
      columns={[
        {
          id: "repairType",
          header: "Reparation",
          className: "px-4 py-3 font-medium text-gray-950",
          cell: (item) => item.repairType.name,
          sortValue: (item) => item.repairType.name,
          searchValue: (item) => item.repairType.name,
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
  const items = vehicleCheck.items ?? [];
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
      onPartOrderUpdated(updatedItem);
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
