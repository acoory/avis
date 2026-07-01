"use client";

import { Copy, ExternalLink, Mail, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatLicensePlate } from "@/lib/format";
import { businessService } from "@/services/business.service";
import { ExternalRepairContact, VehicleCheck } from "@/types/business";

type RepairRequestEmailDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  vehicleCheck: VehicleCheck;
};

export function RepairRequestEmailDialog({
  onOpenChange,
  open,
  vehicleCheck,
}: RepairRequestEmailDialogProps) {
  const [contacts, setContacts] = useState<ExternalRepairContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [publicUrl, setPublicUrl] = useState("");
  const selectedItemsCount = useMemo(
    () => (vehicleCheck.items ?? []).filter((item) => item.selectedForSummary).length,
    [vehicleCheck.items],
  );

  useEffect(() => {
    if (!open) return;

    void businessService.externalRepairContacts().then(setContacts).catch(() => setContacts([]));
  }, [open]);

  function selectContact(contactId: string) {
    setSelectedContactId(contactId);
    const contact = contacts.find((item) => item.id === contactId);

    if (!contact) {
      return;
    }

    setName(contact.name);
    setCompanyName(contact.companyName ?? "");
    setEmail(contact.email);
  }

  async function prepareEmail() {
    if (!email.trim() || !name.trim()) {
      toast.error("Renseigne au minimum un nom et un email prestataire.");
      return;
    }

    setIsPreparing(true);

    try {
      const contact = await businessService.findOrCreateExternalRepairContact({
        companyName: companyName || undefined,
        email,
        name,
      });
      const share = await businessService.createVehicleCheckPublicShare(vehicleCheck.id);
      const url = new URL(`/public/repairs/${share.token}`, window.location.origin).toString();
      setPublicUrl(url);
      openOutlookCompose(contact.email, mailSubject(vehicleCheck), mailBody(vehicleCheck, url, selectedItemsCount));
      toast.success("Email prepare et contact enregistre.");
      onOpenChange(false);
    } catch {
      toast.error("Impossible de preparer l'email prestataire.");
    } finally {
      setIsPreparing(false);
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
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-base font-bold text-slate-950">Envoyer a un prestataire</p>
            <p className="mt-1 text-sm text-slate-500">
              Le contact sera ajoute automatiquement s'il n'existe pas.
            </p>
          </div>
          <Button aria-label="Fermer" size="icon" type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 p-4">
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase text-slate-500">Contact existant</span>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
              value={selectedContactId}
              onChange={(event) => selectContact(event.target.value)}
            >
              <option value="">Nouveau contact ou selection manuelle</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.companyName ? `${contact.companyName} - ` : ""}
                  {contact.name} ({contact.email})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Nom contact</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Societe</span>
              <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-950">Email prepare</p>
            <p className="mt-1">{mailSubject(vehicleCheck)}</p>
            <p className="mt-1 text-xs">{selectedItemsCount} reparation(s) selectionnee(s), photos incluses dans le lien public.</p>
          </div>

          {publicUrl ? (
            <Button className="w-full justify-start" type="button" variant="outline" onClick={copyPublicUrl}>
              <Copy className="h-4 w-4" />
              Copier le dernier lien public
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button disabled={isPreparing} type="button" onClick={prepareEmail}>
            {isPreparing ? <ExternalLink className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {isPreparing ? "Preparation..." : "Ouvrir Outlook"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function mailSubject(vehicleCheck: VehicleCheck) {
  return `Demande de devis reparations - ${vehicleCheck.licensePlate} - ${vehicleCheck.manufacturer?.name ?? "Vehicule"}`;
}

function mailBody(vehicleCheck: VehicleCheck, publicUrl: string, selectedItemsCount: number) {
  const licensePlate = formatLicensePlate(
    vehicleCheck.licensePlate,
    vehicleCheck.licensePlateCountry,
    vehicleCheck.licensePlateRaw,
  );

  return [
    "Bonjour,",
    "",
    "Pouvez-vous nous transmettre un devis pour les reparations selectionnees sur le vehicule suivant :",
    "",
    `Vehicule : ${vehicleCheck.manufacturer?.name ?? "-"} ${vehicleCheck.vehicleModel?.name ?? ""}`.trim(),
    `Immatriculation : ${licensePlate}`,
    `Date du controle : ${formatDate(vehicleCheck.checkDate)}`,
    `Reparations selectionnees : ${selectedItemsCount}`,
    "",
    "Vous pouvez consulter les elements a chiffrer, les commentaires et les photos des degats via ce lien :",
    publicUrl,
    "",
    "Merci de nous retourner votre devis en reponse a cet email.",
    "",
    "Cordialement,",
  ].join("\n");
}

function openOutlookCompose(to: string, subject: string, body: string) {
  const params = new URLSearchParams({
    body,
    subject,
    to,
  });
  const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
  const openedWindow = window.open(outlookUrl, "_blank", "noopener,noreferrer");

  if (!openedWindow) {
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}
