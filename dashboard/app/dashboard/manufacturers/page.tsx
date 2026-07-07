"use client";

import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { businessService } from "@/services/business.service";
import {
  Manufacturer,
  ManufacturerRepairRule,
  ManufacturerRepairRuleStatus,
  RepairType,
} from "@/types/business";
import { useAuthStore } from "@/stores/auth.store";

const editableStatuses: Array<{ value: ManufacturerRepairRuleStatus; label: string }> = [
  { value: "ALLOWED", label: "OUI" },
  { value: "FORBIDDEN", label: "NON" },
  { value: "TO_CHECK", label: "A verifier" },
  { value: "MANDATORY", label: "Obligatoire" },
];

export default function ManufacturersPage() {
  const user = useAuthStore((state) => state.user);
  const canCreateManufacturer = user?.role === "ADMIN" || user?.role === "MANAGER";
  const canEditRules = user?.role === "ADMIN";
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [newManufacturerName, setNewManufacturerName] = useState("");
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([businessService.manufacturers(), businessService.repairTypes()]).then(
      ([manufacturersData, repairTypesData]) => {
        setManufacturers(manufacturersData);
        setRepairTypes(repairTypesData.filter((repairType) => repairType.isActive));
      },
    );
  }, []);

  async function createManufacturer() {
    const name = newManufacturerName.trim();

    if (!name) {
      toast.error("Le nom du constructeur est obligatoire.");
      return;
    }

    setIsCreating(true);
    try {
      const savedManufacturer = await businessService.createManufacturer({ name });
      setManufacturers((current) => sortManufacturers([...current, toManufacturerListItem(savedManufacturer)]));
      setNewManufacturerName("");
      toast.success("Constructeur cree.");
    } catch {
      toast.error("Impossible de creer ce constructeur. Il existe peut-etre deja.");
    } finally {
      setIsCreating(false);
    }
  }

  async function updateMatrixRule(
    manufacturer: Manufacturer,
    repairType: RepairType,
    status: ManufacturerRepairRuleStatus,
  ) {
    const existingRule = findGeneralRule(manufacturer, repairType.id);
    const cellKey = matrixCellKey(manufacturer.id, repairType.id);
    setSavingCell(cellKey);

    try {
      const savedRule = existingRule
        ? await businessService.updateManufacturerRepairRule(existingRule.id, { status })
        : await businessService.createManufacturerRepairRule(manufacturer.id, {
            repairTypeId: repairType.id,
            status,
          });

      setManufacturers((current) =>
        current.map((item) =>
          item.id === manufacturer.id
            ? {
                ...item,
                repairRules: upsertRepairRule(item.repairRules ?? [], savedRule),
                _count: {
                  models: item._count?.models ?? 0,
                  checks: item._count?.checks ?? 0,
                  repairRules: existingRule
                    ? item._count?.repairRules ?? 0
                    : (item._count?.repairRules ?? 0) + 1,
                },
              }
            : item,
        ),
      );
      toast.success("Regle constructeur mise a jour.");
    } catch {
      toast.error("Impossible de modifier cette regle constructeur.");
    } finally {
      setSavingCell(null);
    }
  }

  return (
    <>
      <PageHeader title="Constructeurs" description="Matrice Buy Back par constructeur." />
      {canCreateManufacturer ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nouveau constructeur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                placeholder="Nom du constructeur"
                value={newManufacturerName}
                onChange={(event) => setNewManufacturerName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void createManufacturer();
                  }
                }}
              />
              <Button disabled={isCreating} onClick={() => void createManufacturer()}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <DataTable
        data={manufacturers}
        emptyMessage="Aucun constructeur pour le moment."
        minWidth={960}
        columns={[
          {
            id: "name",
            header: "Constructeur",
            className: "px-4 py-3 font-medium text-gray-950",
            cell: (manufacturer) => (
              <Link
                className="font-semibold text-teal-700 underline-offset-4 hover:underline"
                href={`/dashboard/manufacturers/${manufacturer.id}/rules`}
              >
                {manufacturer.name}
              </Link>
            ),
            sortValue: (manufacturer) => manufacturer.name,
            searchValue: (manufacturer) => manufacturer.name,
          },
          {
            id: "constructorAllowanceAmount",
            header: "Franchise constructeur",
            cell: (manufacturer) => formatMoney(manufacturer.rule?.constructorAllowanceAmount),
            sortValue: (manufacturer) => Number(manufacturer.rule?.constructorAllowanceAmount ?? 0),
            searchValue: (manufacturer) => manufacturer.rule?.constructorAllowanceAmount,
          },
          {
            id: "laborRate",
            header: "Taux horaire",
            cell: (manufacturer) => formatMoney(manufacturer.rule?.laborRate),
            sortValue: (manufacturer) => Number(manufacturer.rule?.laborRate ?? 0),
            searchValue: (manufacturer) => manufacturer.rule?.laborRate,
          },
          {
            id: "revisionRequired",
            header: "Revision",
            cell: (manufacturer) => (
              <Badge variant={manufacturer.rule?.revisionRequired ? "warning" : "outline"}>
                {manufacturer.rule?.revisionRequired ? "Obligatoire" : "Non"}
              </Badge>
            ),
            sortValue: (manufacturer) => (manufacturer.rule?.revisionRequired ? 1 : 0),
            searchValue: (manufacturer) => (manufacturer.rule?.revisionRequired ? "Obligatoire" : "Non"),
          },
          {
            id: "repairRules",
            header: "Regles",
            cell: (manufacturer) => manufacturer._count?.repairRules ?? 0,
            sortValue: (manufacturer) => manufacturer._count?.repairRules ?? 0,
            searchValue: (manufacturer) => manufacturer._count?.repairRules ?? 0,
          },
          {
            id: "view",
            header: "Voir",
            cell: (manufacturer) => (
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/manufacturers/${manufacturer.id}/rules`}>
                  <Eye className="h-4 w-4" />
                  Regles
                </Link>
              </Button>
            ),
          },
        ]}
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Matrice constructeur</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-3 font-medium">Constructeur</th>
                {repairTypes.map((repairType) => (
                  <th className="px-3 py-3 text-center font-medium" key={repairType.id}>
                    {repairType.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {manufacturers.map((manufacturer) => (
                <tr key={manufacturer.id}>
                  <td className="sticky left-0 z-10 bg-white px-3 py-3 font-semibold text-gray-950">
                    {manufacturer.name}
                  </td>
                  {repairTypes.map((repairType) => {
                    const rule = findGeneralRule(manufacturer, repairType.id);
                    const cellKey = matrixCellKey(manufacturer.id, repairType.id);

                    return (
                      <td className="px-3 py-3 text-center" key={repairType.id}>
                        <RuleStatusSelect
                          disabled={!canEditRules || savingCell === cellKey}
                          isSaving={savingCell === cellKey}
                          status={rule?.status ?? "ALLOWED"}
                          onChange={(status) => void updateMatrixRule(manufacturer, repairType, status)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function RuleStatusSelect({
  disabled,
  isSaving,
  status,
  onChange,
}: {
  disabled: boolean;
  isSaving: boolean;
  status: ManufacturerRepairRuleStatus;
  onChange: (status: ManufacturerRepairRuleStatus) => void;
}) {
  return (
    <select
      className={[
        "h-9 w-full min-w-28 rounded-md border px-2 text-xs font-medium shadow-sm",
        status === "FORBIDDEN"
          ? "border-red-200 bg-red-50 text-red-700"
          : status === "TO_CHECK" || status === "CONDITIONAL" || status === "MANDATORY"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700",
        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
      ].join(" ")}
      disabled={disabled}
      title={disabled ? "Edition reservee aux administrateurs" : "Modifier la regle constructeur"}
      value={status === "CONDITIONAL" ? "TO_CHECK" : status}
      onChange={(event) => onChange(event.target.value as ManufacturerRepairRuleStatus)}
    >
      {editableStatuses.map((option) => (
        <option key={option.value} value={option.value}>
          {isSaving ? "..." : option.label}
        </option>
      ))}
    </select>
  );
}

function findGeneralRule(manufacturer: Manufacturer, repairTypeId: string) {
  return manufacturer.repairRules?.find((item) => item.repairTypeId === repairTypeId && !item.vehiclePartId);
}

function upsertRepairRule(rules: ManufacturerRepairRule[], savedRule: ManufacturerRepairRule) {
  const existingIndex = rules.findIndex((rule) => rule.id === savedRule.id);

  if (existingIndex === -1) {
    return [...rules, savedRule];
  }

  return rules.map((rule) => (rule.id === savedRule.id ? savedRule : rule));
}

function matrixCellKey(manufacturerId: string, repairTypeId: string) {
  return `${manufacturerId}:${repairTypeId}`;
}

function toManufacturerListItem(manufacturer: Manufacturer): Manufacturer {
  return {
    ...manufacturer,
    rule: manufacturer.rule ?? null,
    repairRules: manufacturer.repairRules ?? [],
    _count: manufacturer._count ?? {
      models: 0,
      repairRules: 0,
      checks: 0,
    },
  };
}

function sortManufacturers(manufacturers: Manufacturer[]) {
  return [...manufacturers].sort((first, second) =>
    first.name.localeCompare(second.name, "fr", { sensitivity: "base" }),
  );
}
