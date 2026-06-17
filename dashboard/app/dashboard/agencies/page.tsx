"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { businessService } from "@/services/business.service";
import { useAuthStore } from "@/stores/auth.store";
import { Agency } from "@/types/business";

type EditableAgency = {
  id: string;
  code: string;
  name: string;
  city: string;
  region: string;
};

type NewAgency = {
  code: string;
  name: string;
  city: string;
  region: string;
};

const emptyAgency: NewAgency = {
  code: "",
  name: "",
  city: "",
  region: "",
};

export default function AgenciesPage() {
  const user = useAuthStore((state) => state.user);
  const canEdit = user?.role === "ADMIN";
  const [agencies, setAgencies] = useState<EditableAgency[]>([]);
  const [newAgency, setNewAgency] = useState<NewAgency>(emptyAgency);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const cityOptions = useMemo(() => uniqueSorted(agencies.map((agency) => agency.city)), [agencies]);
  const regionOptions = useMemo(() => uniqueSorted(agencies.map((agency) => agency.region)), [agencies]);

  useEffect(() => {
    void businessService.agencies().then((data) => {
      setAgencies(data.map(toEditableAgency));
    });
  }, []);

  async function createAgency() {
    if (!isAgencyValid(newAgency)) {
      toast.error("Code, agence, ville et region sont obligatoires.");
      return;
    }

    setIsCreating(true);
    try {
      const savedAgency = await businessService.createAgency(normalizeAgencyPayload(newAgency));
      setAgencies((current) => sortAgencies([...current, toEditableAgency(savedAgency)]));
      setNewAgency(emptyAgency);
      toast.success("Agence creee.");
    } catch {
      toast.error("Impossible de creer cette agence. Verifie le code et le couple ville/agence.");
    } finally {
      setIsCreating(false);
    }
  }

  async function saveAgency(agency: EditableAgency) {
    if (!isAgencyValid(agency)) {
      toast.error("Code, agence, ville et region sont obligatoires.");
      return;
    }

    setSavingId(agency.id);
    try {
      const savedAgency = await businessService.updateAgency(agency.id, normalizeAgencyPayload(agency));
      setAgencies((current) =>
        sortAgencies(current.map((item) => (item.id === agency.id ? toEditableAgency(savedAgency) : item))),
      );
      toast.success("Agence mise a jour.");
    } catch {
      toast.error("Impossible de modifier cette agence. Verifie le code et le couple ville/agence.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteAgency(agency: EditableAgency) {
    const confirmed = window.confirm(
      `Supprimer l'agence ${agency.city} - ${agency.name} ? Les agences deja utilisees par des controles ne peuvent pas etre supprimees.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingId(agency.id);
    try {
      await businessService.deleteAgency(agency.id);
      setAgencies((current) => current.filter((item) => item.id !== agency.id));
      toast.success("Agence supprimee.");
    } catch {
      toast.error("Impossible de supprimer cette agence car elle est probablement utilisee par des controles.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Agences"
        description="Gestion des agences, villes et regions disponibles dans les controles."
      />
      <Card>
        <CardHeader>
          <CardTitle>Referentiel agences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {canEdit ? (
            <div className="rounded-md border border-dashed border-gray-300 p-4">
              <p className="mb-3 text-sm font-medium text-gray-900">Nouvelle agence</p>
              <div className="grid gap-3 lg:grid-cols-[160px_1fr_180px_180px_auto]">
                <Input
                  className="font-mono text-xs"
                  placeholder="Code"
                  value={newAgency.code}
                  onChange={(event) => setNewAgency((current) => ({ ...current, code: event.target.value }))}
                />
                <Input
                  placeholder="Agence"
                  value={newAgency.name}
                  onChange={(event) => setNewAgency((current) => ({ ...current, name: event.target.value }))}
                />
                <Input
                  list="agency-city-options"
                  placeholder="Ville"
                  value={newAgency.city}
                  onChange={(event) => setNewAgency((current) => ({ ...current, city: event.target.value }))}
                />
                <Input
                  list="agency-region-options"
                  placeholder="Region"
                  value={newAgency.region}
                  onChange={(event) => setNewAgency((current) => ({ ...current, region: event.target.value }))}
                />
                <Button disabled={isCreating} onClick={() => void createAgency()}>
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </div>
          ) : null}

          <datalist id="agency-city-options">
            {cityOptions.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          <datalist id="agency-region-options">
            {regionOptions.map((region) => (
              <option key={region} value={region} />
            ))}
          </datalist>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="px-3 py-3 font-medium">Code</th>
                  <th className="px-3 py-3 font-medium">Agence</th>
                  <th className="px-3 py-3 font-medium">Ville</th>
                  <th className="px-3 py-3 font-medium">Region</th>
                  <th className="px-3 py-3 font-medium">Libelle</th>
                  <th className="px-3 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {agencies.map((agency) => {
                  const isBusy = savingId === agency.id || deletingId === agency.id;

                  return (
                    <tr key={agency.id}>
                      <td className="px-3 py-3">
                        <Input
                          className="font-mono text-xs"
                          disabled={!canEdit || isBusy}
                          value={agency.code}
                          onChange={(event) =>
                            updateAgencyRow(agency.id, { code: event.target.value }, setAgencies)
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          disabled={!canEdit || isBusy}
                          value={agency.name}
                          onChange={(event) =>
                            updateAgencyRow(agency.id, { name: event.target.value }, setAgencies)
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          disabled={!canEdit || isBusy}
                          list="agency-city-options"
                          value={agency.city}
                          onChange={(event) =>
                            updateAgencyRow(agency.id, { city: event.target.value }, setAgencies)
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          disabled={!canEdit || isBusy}
                          list="agency-region-options"
                          value={agency.region}
                          onChange={(event) =>
                            updateAgencyRow(agency.id, { region: event.target.value }, setAgencies)
                          }
                        />
                      </td>
                      <td className="px-3 py-3 text-gray-600">{agency.city} - {agency.name}</td>
                      <td className="px-3 py-3">
                        {canEdit ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              disabled={isBusy}
                              size="icon"
                              title="Enregistrer"
                              type="button"
                              variant="outline"
                              onClick={() => void saveAgency(agency)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              disabled={isBusy}
                              size="icon"
                              title="Supprimer"
                              type="button"
                              variant="outline"
                              onClick={() => void deleteAgency(agency)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="block text-right text-xs text-gray-500">Lecture seule</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!agencies.length ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                      Aucune agence pour le moment.
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

function toEditableAgency(agency: Agency): EditableAgency {
  return {
    id: agency.id,
    code: agency.code,
    name: agency.name,
    city: agency.city,
    region: agency.region,
  };
}

function updateAgencyRow(
  id: string,
  patch: Partial<EditableAgency>,
  setAgencies: Dispatch<SetStateAction<EditableAgency[]>>,
) {
  setAgencies((current) => current.map((agency) => (agency.id === id ? { ...agency, ...patch } : agency)));
}

function normalizeAgencyPayload(agency: NewAgency | EditableAgency) {
  return {
    code: agency.code.trim().toUpperCase(),
    name: agency.name.trim(),
    city: agency.city.trim(),
    region: agency.region.trim(),
  };
}

function isAgencyValid(agency: NewAgency | EditableAgency) {
  return Boolean(agency.code.trim() && agency.name.trim() && agency.city.trim() && agency.region.trim());
}

function sortAgencies(agencies: EditableAgency[]) {
  return [...agencies].sort((first, second) =>
    `${first.region} ${first.city} ${first.name}`.localeCompare(
      `${second.region} ${second.city} ${second.name}`,
      "fr",
      { sensitivity: "base" },
    ),
  );
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((first, second) =>
    first.localeCompare(second, "fr", { sensitivity: "base" }),
  );
}
