"use client";

import { CarFront, Copy, Loader2, Mail, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { businessService } from "@/services/business.service";
import { ExternalRepairCompany, VehicleCheck } from "@/types/business";

type RepairRequestEmailDialogProps = {
  onSent?: (vehicleCheck: VehicleCheck) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  vehicleCheck: VehicleCheck;
};

type SendMode = "single" | "multiple";

type DraftRecipient = {
  email: string;
  id: string;
  name: string;
};

type EmailRecipientPayload = {
  email?: string;
  id?: string;
  name?: string;
};

const NEW_COMPANY_VALUE = "__new_company__";
const NEW_CONTACT_VALUE = "__new_contact__";

export function RepairRequestEmailDialog({
  onSent,
  onOpenChange,
  open,
  vehicleCheck,
}: RepairRequestEmailDialogProps) {
  const [companies, setCompanies] = useState<ExternalRepairCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [sendMode, setSendMode] = useState<SendMode>("single");
  const [selectedSingleContactId, setSelectedSingleContactId] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [draftRecipients, setDraftRecipients] = useState<DraftRecipient[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [publicUrl, setPublicUrl] = useState("");
  const selectedItemsCount = useMemo(
    () =>
      (vehicleCheck.items ?? []).filter(
        (item) =>
          item.selectedForSummary &&
          item.operationalStatus === "ACTIVE" &&
          item.executionMode === "EXTERNAL_PROVIDER",
      ).length,
    [vehicleCheck.items],
  );
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const companyContacts = selectedCompany?.contacts ?? [];
  const isAlreadyDeposited = Boolean(vehicleCheck.publicShare?.takenInChargeAt);
  const isNewCompany = selectedCompanyId === NEW_COMPANY_VALUE;
  const isNewSingleContact = selectedSingleContactId === NEW_CONTACT_VALUE || !companyContacts.length;

  useEffect(() => {
    if (!open) return;

    void businessService
      .externalRepairCompanies()
      .then((data) => {
        setCompanies(data);
        if (!selectedCompanyId && data[0]) {
          selectCompany(data[0].id, data);
        }
      })
      .catch(() => setCompanies([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function selectCompany(companyId: string, sourceCompanies = companies) {
    setSelectedCompanyId(companyId);
    setSendMode("single");
    setSelectedContactIds([]);
    setDraftRecipients([]);
    setNewContactName("");
    setNewContactEmail("");

    if (companyId === NEW_COMPANY_VALUE) {
      setSelectedSingleContactId(NEW_CONTACT_VALUE);
      return;
    }

    const company = sourceCompanies.find((item) => item.id === companyId);
    setSelectedSingleContactId(company?.contacts?.[0]?.id ?? NEW_CONTACT_VALUE);
  }

  function toggleContact(contactId: string) {
    setSelectedContactIds((current) =>
      current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId],
    );
  }

  function addDraftRecipient() {
    const name = newContactName.trim();
    const email = newContactEmail.trim().toLowerCase();

    if (!name || !email) {
      toast.error("Renseigne le nom et l'email du contact.");
      return;
    }

    setDraftRecipients((current) => [
      ...current,
      {
        email,
        id: `draft:${email}:${Date.now()}`,
        name,
      },
    ]);
    setNewContactName("");
    setNewContactEmail("");
  }

  function removeDraftRecipient(id: string) {
    setDraftRecipients((current) => current.filter((recipient) => recipient.id !== id));
  }

  async function sendEmail() {
    const companyName = isNewCompany ? newCompanyName.trim() : selectedCompany?.name;
    const recipients: EmailRecipientPayload[] =
      sendMode === "single"
        ? isNewSingleContact
          ? [{ email: newContactEmail.trim(), name: newContactName.trim() }]
          : [{ id: selectedSingleContactId }]
        : [
            ...selectedContactIds.map((id) => ({ id })),
            ...draftRecipients.map((recipient) => ({
              email: recipient.email,
              name: recipient.name,
            })),
          ];

    if (!companyName) {
      toast.error("Selectionne ou cree une entreprise.");
      return;
    }

    if (!recipients.length) {
      toast.error("Selectionne au moins un destinataire.");
      return;
    }

    if (recipients.some((recipient) => !recipient.id && (!recipient.name?.trim() || !recipient.email?.trim()))) {
      toast.error("Renseigne le nom et l'email du nouveau contact.");
      return;
    }

    setIsSending(true);

    try {
      const share = await businessService.sendVehicleCheckRepairRequestEmail(vehicleCheck.id, {
        companyId: isNewCompany ? undefined : selectedCompanyId,
        companyName,
        recipients,
      });
      const url = new URL(`/public/repairs/${share.token}`, window.location.origin).toString();
      setPublicUrl(url);
      onSent?.({ ...vehicleCheck, publicShare: share });
      toast.success(
        `Dépôt confirmé chez ${companyName}. Le dossier a été envoyé à ${share.recipientEmails.length} destinataire(s).`,
      );
      onOpenChange(false);
    } catch {
      toast.error("Impossible de confirmer le dépôt chez le prestataire.");
    } finally {
      setIsSending(false);
    }
  }

  async function copyPublicUrl() {
    if (!publicUrl) {
      return;
    }

    await navigator.clipboard.writeText(publicUrl);
    toast.success("Lien public copie.");
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div aria-busy={isSending} className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-base font-bold text-slate-950">Confirmer le dépôt</p>
            <p className="mt-1 text-sm text-slate-500">
              {isAlreadyDeposited
                ? "Le dépôt est déjà confirmé. Vous pouvez mettre à jour le prestataire et renvoyer le dossier."
                : "Sélectionnez le prestataire chez lequel le véhicule est déposé."}
            </p>
          </div>
          <Button
            aria-label="Fermer"
            disabled={isSending}
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <fieldset className="min-w-0 space-y-3 p-4" disabled={isSending}>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase text-slate-500">Entreprise</span>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
              value={selectedCompanyId}
              onChange={(event) => selectCompany(event.target.value)}
            >
              <option value="">Selectionner une entreprise</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
              <option value={NEW_COMPANY_VALUE}>+ Nouvelle entreprise</option>
            </select>
          </label>

          {isNewCompany ? (
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Nom entreprise</span>
              <Input value={newCompanyName} onChange={(event) => setNewCompanyName(event.target.value)} />
            </label>
          ) : null}

          {selectedCompanyId ? (
            <>
              <div className="grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1">
                <button
                  className={[
                    "h-9 rounded-sm text-sm font-semibold",
                    sendMode === "single" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500",
                  ].join(" ")}
                  type="button"
                  onClick={() => setSendMode("single")}
                >
                  Une personne
                </button>
                <button
                  className={[
                    "h-9 rounded-sm text-sm font-semibold",
                    sendMode === "multiple" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500",
                  ].join(" ")}
                  type="button"
                  onClick={() => setSendMode("multiple")}
                >
                  Plusieurs
                </button>
              </div>

              {sendMode === "single" ? (
                <SingleRecipientPicker
                  contacts={companyContacts}
                  isNewContact={isNewSingleContact}
                  newContactEmail={newContactEmail}
                  newContactName={newContactName}
                  selectedContactId={selectedSingleContactId}
                  onNewContactEmailChange={setNewContactEmail}
                  onNewContactNameChange={setNewContactName}
                  onSelectedContactChange={setSelectedSingleContactId}
                />
              ) : (
                <MultipleRecipientPicker
                  contacts={companyContacts}
                  draftRecipients={draftRecipients}
                  newContactEmail={newContactEmail}
                  newContactName={newContactName}
                  selectedContactIds={selectedContactIds}
                  onAddDraftRecipient={addDraftRecipient}
                  onNewContactEmailChange={setNewContactEmail}
                  onNewContactNameChange={setNewContactName}
                  onRemoveDraftRecipient={removeDraftRecipient}
                  onToggleContact={toggleContact}
                />
              )}
            </>
          ) : null}

          <div className="rounded-lg border border-teal-100 bg-teal-50/70 p-3 text-sm text-teal-900">
            <p className="font-semibold">En confirmant le dépôt :</p>
            <p className="mt-1">
              {isAlreadyDeposited
                ? "le véhicule restera au statut « Chez le prestataire » et le dossier sera renvoyé par email aux contacts sélectionnés."
                : "le véhicule passera au statut « Chez le prestataire » et le dossier sera envoyé par email aux contacts sélectionnés."}
            </p>
            <p className="mt-2 flex items-start gap-2 text-xs text-teal-800">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{mailSubject(vehicleCheck)} · {selectedItemsCount} réparation(s), photos accessibles depuis le lien public.</span>
            </p>
          </div>

          {publicUrl ? (
            <Button className="w-full justify-start" disabled={isSending} type="button" variant="outline" onClick={copyPublicUrl}>
              <Copy className="h-4 w-4" />
              Copier le dernier lien public
            </Button>
          ) : null}
        </fieldset>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
          <Button disabled={isSending} type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button disabled={isSending} type="button" onClick={() => void sendEmail()}>
            {isSending ? <Send className="h-4 w-4" /> : <CarFront className="h-4 w-4" />}
            {isSending ? "Confirmation..." : "Confirmer le dépôt"}
          </Button>
        </div>

        {isSending ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-center shadow-lg">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-700" />
              <p className="mt-3 text-sm font-semibold text-slate-950">Confirmation du dépôt</p>
              <p className="mt-1 text-xs text-slate-500">Le dossier est envoyé au prestataire.</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function mailSubject(vehicleCheck: VehicleCheck) {
  return `Demande de devis reparations - ${vehicleCheck.licensePlate} - ${vehicleCheck.manufacturer?.name ?? "Vehicule"}`;
}

function SingleRecipientPicker({
  contacts,
  isNewContact,
  newContactEmail,
  newContactName,
  selectedContactId,
  onNewContactEmailChange,
  onNewContactNameChange,
  onSelectedContactChange,
}: {
  contacts: NonNullable<ExternalRepairCompany["contacts"]>;
  isNewContact: boolean;
  newContactEmail: string;
  newContactName: string;
  selectedContactId: string;
  onNewContactEmailChange: (value: string) => void;
  onNewContactNameChange: (value: string) => void;
  onSelectedContactChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      {contacts.length ? (
        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
            value={selectedContactId}
            onChange={(event) => onSelectedContactChange(event.target.value)}
          >
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name} - {contact.email}
              </option>
            ))}
            <option value={NEW_CONTACT_VALUE}>+ Ajouter un email</option>
          </select>
        </label>
      ) : null}

      {isNewContact ? (
        <NewContactFields
          email={newContactEmail}
          name={newContactName}
          onEmailChange={onNewContactEmailChange}
          onNameChange={onNewContactNameChange}
        />
      ) : null}
    </div>
  );
}

function MultipleRecipientPicker({
  contacts,
  draftRecipients,
  newContactEmail,
  newContactName,
  selectedContactIds,
  onAddDraftRecipient,
  onNewContactEmailChange,
  onNewContactNameChange,
  onRemoveDraftRecipient,
  onToggleContact,
}: {
  contacts: NonNullable<ExternalRepairCompany["contacts"]>;
  draftRecipients: DraftRecipient[];
  newContactEmail: string;
  newContactName: string;
  selectedContactIds: string[];
  onAddDraftRecipient: () => void;
  onNewContactEmailChange: (value: string) => void;
  onNewContactNameChange: (value: string) => void;
  onRemoveDraftRecipient: (id: string) => void;
  onToggleContact: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {contacts.length ? (
        <div className="rounded-md border border-slate-200">
          {contacts.map((contact) => (
            <label className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0" key={contact.id}>
              <input
                checked={selectedContactIds.includes(contact.id)}
                className="h-4 w-4 rounded border-slate-300"
                type="checkbox"
                onChange={() => onToggleContact(contact.id)}
              />
              <span className="min-w-0 text-sm">
                <span className="font-semibold text-slate-950">{contact.name}</span>
                <span className="ml-2 text-slate-500">{contact.email}</span>
              </span>
            </label>
          ))}
        </div>
      ) : null}

      {draftRecipients.length ? (
        <div className="space-y-2">
          {draftRecipients.map((recipient) => (
            <div className="flex items-center justify-between gap-3 rounded-md bg-teal-50 px-3 py-2 text-sm" key={recipient.id}>
              <span className="min-w-0 truncate text-teal-900">
                {recipient.name} - {recipient.email}
              </span>
              <button className="text-xs font-semibold text-teal-800" type="button" onClick={() => onRemoveDraftRecipient(recipient.id)}>
                Retirer
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-md border border-dashed border-slate-300 p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Ajouter un email</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Nom contact" value={newContactName} onChange={(event) => onNewContactNameChange(event.target.value)} />
          <Input
            placeholder="email@entreprise.fr"
            type="email"
            value={newContactEmail}
            onChange={(event) => onNewContactEmailChange(event.target.value)}
          />
          <Button type="button" variant="outline" onClick={onAddDraftRecipient}>
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewContactFields({
  email,
  name,
  onEmailChange,
  onNameChange,
}: {
  email: string;
  name: string;
  onEmailChange: (value: string) => void;
  onNameChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1">
        <span className="text-xs font-semibold uppercase text-slate-500">Nom contact</span>
        <Input value={name} onChange={(event) => onNameChange(event.target.value)} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
        <Input type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} />
      </label>
    </div>
  );
}
