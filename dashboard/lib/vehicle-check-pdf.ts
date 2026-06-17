import { formatDate, formatLicensePlate, formatMoney } from "@/lib/format";
import { VehicleCheck } from "@/types/business";

const decisionLabels = {
  ACCEPTED: "Acceptee",
  TO_CHECK: "A verifier",
  NOT_PROFITABLE: "Non rentable",
  FORBIDDEN: "Interdite",
  MANDATORY: "Obligatoire",
  WARNING: "Attention",
} as const;

const operationalStatusLabels = {
  ACTIVE: "Pret reparation",
  IMPOSSIBLE: "Reparation impossible",
  CANCELLED: "Annulee",
} as const;

export async function createVehicleCheckPdfFile(vehicleCheck: VehicleCheck) {
  if (vehicleCheck.status !== "SUMMARY_READY") {
    throw new Error("The summary is not ready");
  }

  const summaryItems = (vehicleCheck.items ?? []).filter(
    (item) => item.selectedForSummary,
  );
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function ensureSpace(requiredHeight: number) {
    if (y + requiredHeight <= pageHeight - 16) {
      return;
    }

    document.addPage();
    y = margin;
  }

  function addWrappedText(
    text: string,
    options: { fontSize?: number; color?: [number, number, number]; indent?: number } = {},
  ) {
    const fontSize = options.fontSize ?? 10;
    const indent = options.indent ?? 0;
    const lines = document.splitTextToSize(text || "-", contentWidth - indent);
    const lineHeight = fontSize * 0.42;
    ensureSpace(lines.length * lineHeight + 2);
    document.setFontSize(fontSize);
    document.setTextColor(...(options.color ?? [31, 41, 55]));
    document.text(lines, margin + indent, y);
    y += lines.length * lineHeight + 2;
  }

  function addSectionTitle(title: string) {
    ensureSpace(10);
    y += 3;
    document.setFont("helvetica", "bold");
    document.setFontSize(12);
    document.setTextColor(17, 24, 39);
    document.text(title, margin, y);
    document.setDrawColor(209, 213, 219);
    document.line(margin, y + 2, pageWidth - margin, y + 2);
    document.setFont("helvetica", "normal");
    y += 7;
  }

  function addField(label: string, value: string, x: number, width: number, fieldY: number) {
    document.setFont("helvetica", "normal");
    document.setFontSize(8);
    document.setTextColor(107, 114, 128);
    document.text(label.toUpperCase(), x, fieldY);
    document.setFont("helvetica", "bold");
    document.setFontSize(10);
    document.setTextColor(17, 24, 39);
    const lines = document.splitTextToSize(value || "-", width);
    document.text(lines.slice(0, 2), x, fieldY + 4);
  }

  document.setFont("helvetica", "bold");
  document.setFontSize(17);
  document.setTextColor(17, 24, 39);
  document.text("Synthese controle vehicule", margin, y);
  y += 7;

  document.setFontSize(13);
  document.setTextColor(13, 116, 110);
  document.text(vehicleCheck.checkNumber, margin, y);
  y += 5;

  document.setFont("helvetica", "normal");
  addWrappedText(
    `${formatLicensePlate(
      vehicleCheck.licensePlate,
      vehicleCheck.licensePlateCountry,
      vehicleCheck.licensePlateRaw,
    )} | ${vehicleCheck.manufacturer?.name ?? "-"} | ${formatDate(vehicleCheck.checkDate)}`,
    { color: [75, 85, 99] },
  );

  document.setDrawColor(209, 213, 219);
  document.line(margin, y, pageWidth - margin, y);
  y += 7;

  const columnWidth = contentWidth / 3;
  addField("Agence", vehicleCheck.agency?.name ?? "-", margin, columnWidth - 4, y);
  addField(
    "Collaborateur",
    vehicleCheck.collaborator
      ? `${vehicleCheck.collaborator.firstName} ${vehicleCheck.collaborator.lastName}`
      : "-",
    margin + columnWidth,
    columnWidth - 4,
    y,
  );
  addField("Ville", vehicleCheck.city, margin + columnWidth * 2, columnWidth - 4, y);
  y += 13;

  addField("Modele", vehicleCheck.vehicleModel?.name ?? "Non precise", margin, columnWidth - 4, y);
  addField(
    "Kilometrage",
    vehicleCheck.mileage ? `${vehicleCheck.mileage.toLocaleString("fr-FR")} km` : "-",
    margin + columnWidth,
    columnWidth - 4,
    y,
  );
  addField(
    "Franchise constructeur",
    formatMoney(vehicleCheck.constructorAllowanceAmount),
    margin + columnWidth * 2,
    columnWidth - 4,
    y,
  );
  y += 12;

  addSectionTitle("Travaux selectionnes");
  addWrappedText(
    summaryItems.length
      ? `${summaryItems.length} reparation(s) retenue(s) pour la demande de devis.`
      : "Aucune reparation retenue.",
  );

  addSectionTitle("Reparations a chiffrer");
  if (!summaryItems.length) {
    addWrappedText("Aucune reparation selectionnee pour ce vehicule.", { color: [6, 95, 70] });
  } else {
    summaryItems.forEach((item, index) => {
      const detailLines = [
        item.decisionMessage?.trim() || null,
        item.comment?.trim() ? `Commentaire : ${item.comment}` : null,
        item.operationalComment?.trim() ? `Suivi : ${item.operationalComment}` : null,
        item.partOrderRequired
          ? `Commande piece : ${item.partOrderStatus === "ORDERED" ? "commandee" : "a commander"}${
              item.partOrderReference ? ` (${item.partOrderReference})` : ""
            }`
          : null,
      ].filter((value): value is string => Boolean(value));
      const estimatedHeight = 19 + detailLines.join(" ").length / 55 * 4;

      ensureSpace(estimatedHeight);
      document.setFillColor(249, 250, 251);
      document.roundedRect(margin, y - 4, contentWidth, Math.max(17, estimatedHeight), 1.5, 1.5, "F");
      document.setFont("helvetica", "bold");
      document.setFontSize(10);
      document.setTextColor(17, 24, 39);
      document.text(
        `${index + 1}. ${item.vehiclePart?.name ?? "Aucun element"} - ${item.repairType.name} x${item.quantity}`,
        margin + 3,
        y + 1,
      );
      y += 6;
      document.setFont("helvetica", "normal");
      addWrappedText(
        `Decision : ${decisionLabels[item.decisionStatus]} | Statut : ${operationalStatusLabels[item.operationalStatus]}`,
        { fontSize: 9, indent: 3, color: [13, 116, 110] },
      );
      detailLines.forEach((line) => addWrappedText(line, { fontSize: 9, indent: 3 }));
      y += 3;
    });
  }

  addSectionTitle("Observations");
  addWrappedText(vehicleCheck.notes?.trim() || "Aucune observation complementaire.");

  const pageCount = document.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page);
    document.setFont("helvetica", "normal");
    document.setFontSize(8);
    document.setTextColor(107, 114, 128);
    document.text(
      `Genere le ${formatDate(new Date())} | Page ${page}/${pageCount}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" },
    );
  }

  return new File([document.output("blob")], `${vehicleCheck.checkNumber}.pdf`, {
    type: "application/pdf",
  });
}

export async function downloadVehicleCheckPdf(vehicleCheck: VehicleCheck) {
  const file = await createVehicleCheckPdfFile(vehicleCheck);
  downloadPdfFile(file);
}

export function downloadPdfFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareVehicleCheckPdfByEmail(vehicleCheck: VehicleCheck) {
  const licensePlate = formatLicensePlate(
    vehicleCheck.licensePlate,
    vehicleCheck.licensePlateCountry,
    vehicleCheck.licensePlateRaw,
  );
  const subject = `Véhicule control : ${licensePlate}`;
  const body = `Bonjour,\n\nVeuillez trouver la synthèse du véhicule ${licensePlate} en pièce jointe.\n\nCordialement`;
  const file = await createVehicleCheckPdfFile(vehicleCheck);
  const shareData = { title: subject, text: body, files: [file] };

  if (
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare(shareData))
  ) {
    await navigator.share(shareData);
    return { shared: true, downloaded: false };
  }

  downloadPdfFile(file);
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    `${body}\n\nLe PDF vient d'être téléchargé : ajoute-le à ton email avant l'envoi.`,
  )}`;

  return { shared: false, downloaded: true };
}
