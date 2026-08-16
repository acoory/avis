"use client";

import {
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  MessageSquareText,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatLicensePlate } from "@/lib/format";
import { riskService } from "@/services/risk.service";
import { useAuthStore } from "@/stores/auth.store";
import { RiskVehicle } from "@/types/risk";

export default function RiskPage() {
  const user = useAuthStore((state) => state.user);
  const [vehicles, setVehicles] = useState<RiskVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void riskService
      .list()
      .then(setVehicles)
      .finally(() => setIsLoading(false));
  }, []);

  const stats = useMemo(
    () => ({
      closed: vehicles.filter((vehicle) => vehicle.status === "CLOSED").length,
      draft: vehicles.filter((vehicle) => vehicle.status === "DRAFT").length,
      submitted: vehicles.filter((vehicle) => vehicle.status === "SUBMITTED")
        .length,
    }),
    [vehicles],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Risk (Show room)"
          description="Dossiers photographiques, analyses et echanges autour des vehicules Risk."
        />
        <Button asChild>
          <Link href="/dashboard/risk/new">
            <Plus className="h-4 w-4" />
            Nouveau dossier
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={Camera} label="Brouillons" value={stats.draft} />
        <MiniStat
          icon={Clock3}
          label="Transmis / A analyser"
          value={stats.submitted}
        />
        <MiniStat icon={CheckCircle2} label="Clos" value={stats.closed} />
      </div>

      {isLoading ? (
        <LoadingScreen fullScreen={false} />
      ) : vehicles.length ? (
        <RiskVehicleTable userId={user?.id} vehicles={vehicles} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Camera className="h-10 w-10 text-slate-300" />
            <p className="mt-4 font-semibold text-slate-950">
              Aucun dossier Risk
            </p>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Creez le premier dossier pour commencer la prise de photos guidee.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RiskVehicleTable({
  userId,
  vehicles,
}: {
  userId?: string;
  vehicles: RiskVehicle[];
}) {
  return (
    <DataTable
      data={vehicles}
      emptyMessage="Aucun dossier Risk pour le moment."
      initialSort={{ column: "updatedAt", direction: "desc" }}
      minWidth={980}
      mobileCard={(vehicle) => (
        <RiskVehicleMobileCard userId={userId} vehicle={vehicle} />
      )}
      columns={[
        {
          id: "riskNumber",
          header: "Dossier",
          className: "px-4 py-3 font-medium text-gray-950",
          cell: (vehicle) => (
            <div className="min-w-0">
              <Link
                className="font-semibold text-teal-700 underline-offset-4 hover:underline"
                href={`/dashboard/risk/${vehicle.id}`}
              >
                {vehicle.riskNumber}
              </Link>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Créé le {formatDate(vehicle.createdAt)}
              </p>
            </div>
          ),
          sortValue: (vehicle) => vehicle.riskNumber,
          searchValue: (vehicle) => vehicle.riskNumber,
        },
        {
          id: "licensePlate",
          header: "Véhicule",
          className: "px-4 py-3 text-gray-900",
          cell: (vehicle) => (
            <div className="min-w-0">
              <p className="font-semibold">{vehiclePlate(vehicle)}</p>
              <p className="mt-1 truncate text-xs font-medium text-gray-500">
                {vehicle.manufacturer.name}
              </p>
            </div>
          ),
          sortValue: (vehicle) => vehicle.licensePlate,
          searchValue: (vehicle) =>
            `${vehiclePlate(vehicle)} ${vehicle.licensePlate} ${vehicle.licensePlateRaw ?? ""} ${vehicle.manufacturer.name}`,
        },
        {
          id: "agency",
          header: "Agence",
          cell: (vehicle) => vehicle.agency.name,
          sortValue: (vehicle) => vehicle.agency.name,
          searchValue: (vehicle) => vehicle.agency.name,
        },
        {
          id: "assignee",
          header: "Responsable",
          cell: (vehicle) => primaryAssigneeName(vehicle),
          sortValue: primaryAssigneeName,
          searchValue: primaryAssigneeName,
        },
        {
          id: "messages",
          header: "Commentaires",
          cell: (vehicle) => {
            const count = messageCount(vehicle);
            return (
              <span className="inline-flex items-center gap-1.5">
                <MessageSquareText className="h-4 w-4 text-slate-400" />
                {count}
              </span>
            );
          },
          sortValue: messageCount,
          searchValue: messageCount,
        },
        {
          id: "status",
          header: "Statut",
          cell: (vehicle) => (
            <span className={statusClass(vehicle.status)}>
              {statusLabel(vehicle, userId)}
            </span>
          ),
          sortValue: (vehicle) => statusLabel(vehicle, userId),
          searchValue: (vehicle) => statusLabel(vehicle, userId),
        },
        {
          id: "updatedAt",
          header: "Mise à jour",
          cell: (vehicle) => formatDate(vehicle.updatedAt),
          sortValue: (vehicle) => new Date(vehicle.updatedAt),
          searchValue: (vehicle) => formatDate(vehicle.updatedAt),
        },
        {
          id: "actions",
          header: "Actions",
          className: "px-4 py-3",
          cell: (vehicle) => (
            <Button
              asChild
              className="h-9 w-9 border-teal-200 px-0 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
              size="sm"
              title="Détail"
              variant="outline"
            >
              <Link
                aria-label={`Voir le dossier ${vehicle.riskNumber}`}
                href={`/dashboard/risk/${vehicle.id}`}
              >
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
          ),
        },
      ]}
    />
  );
}

function RiskVehicleMobileCard({
  userId,
  vehicle,
}: {
  userId?: string;
  vehicle: RiskVehicle;
}) {
  const comments = messageCount(vehicle);

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            className="block truncate text-base font-bold text-teal-700 underline-offset-4 hover:underline"
            href={`/dashboard/risk/${vehicle.id}`}
          >
            {vehiclePlate(vehicle)}
          </Link>
          <p className="mt-1 text-xs font-semibold text-gray-500">
            {vehicle.riskNumber}
          </p>
        </div>
        <span className={statusClass(vehicle.status)}>
          {statusLabel(vehicle, userId)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <MobileDetail label="Agence" value={vehicle.agency.name} />
        <MobileDetail
          label="Responsable"
          value={primaryAssigneeName(vehicle)}
        />
        <MobileDetail label="Constructeur" value={vehicle.manufacturer.name} />
        <MobileDetail
          label="Commentaires"
          value={`${comments} commentaire${comments > 1 ? "s" : ""}`}
        />
      </div>

      <div className="mt-3 border-t border-gray-100 pt-3">
        <Button
          asChild
          className="h-9 w-full border-teal-200 text-teal-700 hover:bg-teal-50"
          size="sm"
          variant="outline"
        >
          <Link href={`/dashboard/risk/${vehicle.id}`}>
            <Eye className="h-4 w-4" />
            Détail
          </Link>
        </Button>
      </div>
    </article>
  );
}

function MobileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase text-gray-500">{label}</p>
      <p className="mt-1 truncate font-semibold text-gray-900" title={value}>
        {value}
      </p>
    </div>
  );
}

function vehiclePlate(vehicle: RiskVehicle) {
  return formatLicensePlate(
    vehicle.licensePlate,
    vehicle.licensePlateCountry,
    vehicle.licensePlateRaw,
  );
}

function primaryAssigneeName(vehicle: RiskVehicle) {
  const primary = vehicle.assignments.find(
    (assignment) => assignment.role === "PRIMARY",
  )?.user;
  return primary
    ? `${primary.firstName} ${primary.lastName}`.trim()
    : "Non assigné";
}

function messageCount(vehicle: RiskVehicle) {
  return vehicle.conversation?.messages.length ?? 0;
}

function statusLabel(vehicle: RiskVehicle, userId?: string) {
  if (vehicle.status === "DRAFT") return "Brouillon";
  if (vehicle.status === "CLOSED") return "Clos";
  return vehicle.creatorId === userId ? "Transmis" : "À analyser";
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Camera;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        <span className="hidden h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 sm:flex">
          <Icon className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-xl font-bold text-slate-950">
            {value}
          </span>
          <span className="block text-[11px] font-semibold uppercase text-slate-500">
            {label}
          </span>
        </span>
      </CardContent>
    </Card>
  );
}

function statusClass(status: RiskVehicle["status"]) {
  const tone =
    status === "DRAFT"
      ? "bg-slate-100 text-slate-700"
      : status === "CLOSED"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-amber-100 text-amber-800";
  return `shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`;
}
