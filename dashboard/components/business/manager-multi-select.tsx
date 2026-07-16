"use client";

import { Check, ChevronDown, Search, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ManagerOption = {
  email?: string;
  firstName: string;
  id: string;
  lastName: string;
};

type ManagerMultiSelectProps = {
  disabled?: boolean;
  isSaving?: boolean;
  managers: ManagerOption[];
  onChange?: (managerIds: string[]) => void;
  onSave?: (managerIds: string[]) => Promise<void> | void;
  placeholder?: string;
  value: string[];
};

export function ManagerMultiSelect({
  disabled = false,
  isSaving = false,
  managers,
  onChange,
  onSave,
  placeholder = "Choisir les managers",
  value,
}: ManagerMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftValue, setDraftValue] = useState(value);

  const filteredManagers = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return managers;
    return managers.filter((manager) =>
      normalize(`${manager.firstName} ${manager.lastName} ${manager.email}`).includes(normalizedQuery),
    );
  }, [managers, query]);

  const selectedManagers = managers.filter((manager) => value.includes(manager.id));
  const visibleValue = onSave && open ? draftValue : value;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraftValue(value);
      setQuery("");
    }
    setOpen(nextOpen);
  }

  function toggle(managerId: string) {
    const nextValue = visibleValue.includes(managerId)
      ? visibleValue.filter((id) => id !== managerId)
      : [...visibleValue, managerId];
    setDraftValue(nextValue);
    if (!onSave) onChange?.(nextValue);
  }

  async function save() {
    await onSave?.(draftValue);
    setOpen(false);
  }

  return (
    <div className="min-w-0 space-y-2">
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Attribuer des managers"
            className="flex min-h-10 w-full min-w-56 items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled || isSaving}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2">
              <UsersRound className="h-4 w-4 shrink-0 text-gray-400" />
              <span className={cn("truncate", value.length ? "font-medium" : "text-gray-500")}>
                {isSaving
                  ? "Enregistrement..."
                  : value.length
                    ? `${value.length} manager${value.length > 1 ? "s" : ""} selectionne${value.length > 1 ? "s" : ""}`
                    : placeholder}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[min(22rem,calc(100vw-2rem))] p-0"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="border-b border-gray-100 p-3">
            <p className="text-sm font-semibold text-gray-950">Managers attribues</p>
            <p className="mt-0.5 text-xs text-gray-500">Cochez une ou plusieurs personnes.</p>
            {managers.length > 5 ? (
              <label className="mt-3 flex items-center gap-2 rounded-md border border-gray-200 px-2.5">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  placeholder="Rechercher un manager"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </label>
            ) : null}
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filteredManagers.length ? (
              filteredManagers.map((manager) => {
                const checked = visibleValue.includes(manager.id);
                return (
                  <button
                    aria-pressed={checked}
                    className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
                    key={manager.id}
                    type="button"
                    onClick={() => toggle(manager.id)}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                        checked ? "border-teal-700 bg-teal-700 text-white" : "border-gray-300 bg-white",
                      )}
                    >
                      {checked ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-950">
                        {manager.firstName} {manager.lastName}
                      </span>
                      {manager.email ? (
                        <span className="block truncate text-xs text-gray-500">{manager.email}</span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-5 text-center text-sm text-gray-500">Aucun manager trouve.</p>
            )}
          </div>
          {onSave ? (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 p-3">
              <span className="text-xs text-gray-500">
                {draftValue.length} selection{draftValue.length > 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <button
                  className="h-8 rounded-md px-3 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </button>
                <button
                  className="h-8 rounded-md bg-teal-700 px-3 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                  disabled={isSaving}
                  type="button"
                  onClick={() => void save()}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedManagers.length ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedManagers.map((manager) => (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800"
              key={manager.id}
            >
              <span className="truncate">{manager.firstName} {manager.lastName}</span>
              {!onSave ? (
                <button
                  aria-label={`Retirer ${manager.firstName} ${manager.lastName}`}
                  className="rounded-full p-0.5 hover:bg-teal-100"
                  type="button"
                  onClick={() => toggle(manager.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
