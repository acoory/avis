"use client";

import { Plus, Save } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { businessService } from "@/services/business.service";
import { useAuthStore } from "@/stores/auth.store";
import { RepairType } from "@/types/business";

type EditableRepairType = {
  id: string;
  code: string;
  name: string;
  defaultInternalSavingAmount: string;
  isActive: boolean;
};

type NewRepairType = {
  code: string;
  name: string;
  defaultInternalSavingAmount: string;
  isActive: boolean;
};

const emptyRepairType: NewRepairType = {
  code: "",
  name: "",
  defaultInternalSavingAmount: "",
  isActive: true,
};

export default function RepairTypesPage() {
  const user = useAuthStore((state) => state.user);
  const canEdit = user?.role === "ADMIN";
  const [repairTypes, setRepairTypes] = useState<EditableRepairType[]>([]);
  const [newRepairType, setNewRepairType] = useState<NewRepairType>(emptyRepairType);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    void businessService.repairTypes().then((data) => {
      setRepairTypes(data.map(toEditableRepairType));
    });
  }, []);

  async function saveRepairType(repairType: EditableRepairType) {
    if (!repairType.code.trim() || !repairType.name.trim() || !repairType.defaultInternalSavingAmount.trim()) {
      toast.error("Code, nom et economie reference sont obligatoires.");
      return;
    }

    setSavingId(repairType.id);
    try {
      const savedRepairType = await businessService.updateRepairType(repairType.id, {
        code: repairType.code.trim().toUpperCase(),
        name: repairType.name.trim(),
        defaultInternalSavingAmount: normalizeAmountInput(repairType.defaultInternalSavingAmount),
        isActive: repairType.isActive,
      });
      setRepairTypes((current) =>
        current.map((item) => (item.id === repairType.id ? toEditableRepairType(savedRepairType) : item)),
      );
      toast.success("Type de reparation mis a jour.");
    } catch {
      toast.error("Impossible de mettre a jour ce type de reparation.");
    } finally {
      setSavingId(null);
    }
  }

  async function createRepairType() {
    if (!newRepairType.code.trim() || !newRepairType.name.trim() || !newRepairType.defaultInternalSavingAmount.trim()) {
      toast.error("Code, nom et economie reference sont obligatoires.");
      return;
    }

    setIsCreating(true);
    try {
      const savedRepairType = await businessService.createRepairType({
        code: newRepairType.code.trim().toUpperCase(),
        name: newRepairType.name.trim(),
        defaultInternalSavingAmount: normalizeAmountInput(newRepairType.defaultInternalSavingAmount),
        isActive: newRepairType.isActive,
      });
      setRepairTypes((current) =>
        [...current, toEditableRepairType(savedRepairType)].sort((first, second) => first.name.localeCompare(second.name)),
      );
      setNewRepairType(emptyRepairType);
      toast.success("Type de reparation cree.");
    } catch {
      toast.error("Impossible de creer ce type de reparation.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <PageHeader title="Types de reparations" description="Edition des economies de reference utilisees par le moteur." />
      <Card>
        <CardHeader>
          <CardTitle>Referentiel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {canEdit ? (
            <div className="rounded-md border border-dashed border-gray-300 p-4">
              <p className="mb-3 text-sm font-medium text-gray-900">Nouveau type de reparation</p>
              <div className="grid gap-3 lg:grid-cols-[180px_1fr_180px_140px_auto]">
                <Input
                  placeholder="Code"
                  value={newRepairType.code}
                  onChange={(event) =>
                    setNewRepairType((current) => ({ ...current, code: event.target.value.toUpperCase() }))
                  }
                />
                <Input
                  placeholder="Nom"
                  value={newRepairType.name}
                  onChange={(event) => setNewRepairType((current) => ({ ...current, name: event.target.value }))}
                />
                <Input
                  inputMode="decimal"
                  placeholder="Economie reference"
                  value={newRepairType.defaultInternalSavingAmount}
                  onChange={(event) =>
                    setNewRepairType((current) => ({
                      ...current,
                      defaultInternalSavingAmount: event.target.value,
                    }))
                  }
                />
                <select
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm"
                  value={newRepairType.isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    setNewRepairType((current) => ({
                      ...current,
                      isActive: event.target.value === "active",
                    }))
                  }
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
                <Button disabled={isCreating} onClick={() => void createRepairType()}>
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="px-3 py-3 font-medium">Code</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">Economie reference</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-3 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {repairTypes.map((repairType) => (
                  <tr key={repairType.id}>
                    <td className="px-3 py-3">
                      <Input
                        className="font-mono text-xs"
                        disabled={!canEdit || savingId === repairType.id}
                        value={repairType.code}
                        onChange={(event) =>
                          updateRepairTypeRow(repairType.id, { code: event.target.value.toUpperCase() }, setRepairTypes)
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        disabled={!canEdit || savingId === repairType.id}
                        value={repairType.name}
                        onChange={(event) =>
                          updateRepairTypeRow(repairType.id, { name: event.target.value }, setRepairTypes)
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        disabled={!canEdit || savingId === repairType.id}
                        inputMode="decimal"
                        value={repairType.defaultInternalSavingAmount}
                        onChange={(event) =>
                          updateRepairTypeRow(
                            repairType.id,
                            { defaultInternalSavingAmount: event.target.value },
                            setRepairTypes,
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      {canEdit ? (
                        <select
                          className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm"
                          disabled={savingId === repairType.id}
                          value={repairType.isActive ? "active" : "inactive"}
                          onChange={(event) =>
                            updateRepairTypeRow(
                              repairType.id,
                              { isActive: event.target.value === "active" },
                              setRepairTypes,
                            )
                          }
                        >
                          <option value="active">Actif</option>
                          <option value="inactive">Inactif</option>
                        </select>
                      ) : (
                        <Badge variant={repairType.isActive ? "success" : "outline"}>
                          {repairType.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {canEdit ? (
                        <Button
                          disabled={savingId === repairType.id}
                          size="sm"
                          variant="outline"
                          onClick={() => void saveRepairType(repairType)}
                        >
                          <Save className="h-4 w-4" />
                          Enregistrer
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-500">Lecture seule</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!repairTypes.length ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                      Aucun type de reparation pour le moment.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function toEditableRepairType(repairType: RepairType): EditableRepairType {
  return {
    id: repairType.id,
    code: repairType.code,
    name: repairType.name,
    defaultInternalSavingAmount: repairType.defaultInternalSavingAmount,
    isActive: repairType.isActive,
  };
}

function updateRepairTypeRow(
  id: string,
  patch: Partial<EditableRepairType>,
  setRepairTypes: Dispatch<SetStateAction<EditableRepairType[]>>,
) {
  setRepairTypes((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
}

function normalizeAmountInput(value: string) {
  const normalizedValue = value.replace(",", ".").trim();
  const parsedValue = Number(normalizedValue);

  if (Number.isNaN(parsedValue)) {
    return normalizedValue;
  }

  return parsedValue.toFixed(2);
}
