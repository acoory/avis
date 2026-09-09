export const commercialSlots = [
  {
    key: "front-left",
    label: "Trois-quarts avant gauche",
    group: "Extérieur",
    hint: "Cadrer tout le véhicule depuis l’avant gauche.",
  },
  {
    key: "front-right",
    label: "Trois-quarts avant droit",
    group: "Extérieur",
    hint: "Cadrer tout le véhicule depuis l’avant droit.",
  },
  {
    key: "rear-left",
    label: "Trois-quarts arrière gauche",
    group: "Extérieur",
    hint: "Cadrer tout le véhicule depuis l’arrière gauche.",
  },
  {
    key: "rear-right",
    label: "Trois-quarts arrière droit",
    group: "Extérieur",
    hint: "Cadrer tout le véhicule depuis l’arrière droit.",
  },
  {
    key: "dashboard",
    label: "Compteur et kilométrage",
    group: "Intérieur",
    hint: "Compteur allumé, kilométrage parfaitement lisible.",
  },
  {
    key: "secondScreen",
    label: "Deuxième écran du tableau de bord",
    group: "Intérieur",
    hint: "Photographier l’autre écran allumé : écran central ou affichage derrière le volant. Les informations doivent être lisibles.",
    optional: true,
  },
  {
    key: "interior-front",
    label: "Vue d’ensemble de l’habitacle avant",
    group: "Intérieur",
    hint: "Prendre une vue large de l’avant : tableau de bord, volant et sièges dans leur ensemble.",
  },
  {
    key: "interior-rear",
    label: "Vue d’ensemble de l’habitacle arrière",
    group: "Intérieur",
    hint: "Prendre une vue large de tout l’habitacle arrière, avec les sièges et l’espace autour.",
  },
  {
    key: "seats-front",
    label: "Sièges avant · Vue de face détaillée",
    group: "Intérieur",
    hint: "Se placer face aux sièges avant et cadrer de près les assises et les dossiers pour montrer leur état.",
  },
  {
    key: "seats-rear",
    label: "Sièges arrière · Vue de face détaillée",
    group: "Intérieur",
    hint: "Se placer face à la banquette ou aux sièges arrière et cadrer de près les assises et les dossiers pour montrer leur état.",
  },
  {
    key: "wheel-front-left",
    label: "Roue avant gauche",
    group: "Roues",
    hint: "Montrer la jante et le pneu en entier.",
  },
  {
    key: "wheel-front-right",
    label: "Roue avant droite",
    group: "Roues",
    hint: "Montrer la jante et le pneu en entier.",
  },
  {
    key: "wheel-rear-left",
    label: "Roue arrière gauche",
    group: "Roues",
    hint: "Montrer la jante et le pneu en entier.",
  },
  {
    key: "wheel-rear-right",
    label: "Roue arrière droite",
    group: "Roues",
    hint: "Montrer la jante et le pneu en entier.",
  },
  {
    key: "trunk",
    label: "Coffre",
    group: "Coffre et accessoires",
    hint: "Coffre ouvert, espace de chargement bien visible.",
  },
  {
    key: "sunroof",
    label: "Toit ouvrant",
    group: "Intérieur",
    hint: "Montrer son état et son ouverture.",
    optional: true,
  },
  {
    key: "serviceBook",
    label: "Carnet d’entretien",
    group: "Documents",
    hint: "Vérifier la boîte à gants et masquer les données personnelles.",
    optional: true,
  },
  {
    key: "manual",
    label: "Manuel d’utilisation",
    group: "Documents",
    hint: "Vérifier sa présence dans la boîte à gants.",
    optional: true,
  },
  {
    key: "accessories",
    label: "Accessoires présents",
    group: "Coffre et accessoires",
    hint: "Disposer les accessoires dans le coffre : CB, kit, câbles…",
    optional: true,
  },
];
export function commercialJourneySlots(
  secondScreen: string | undefined,
  photos: { slotKey: string }[],
) {
  return commercialSlots.filter(
    (slot) =>
      slot.key !== "secondScreen" ||
      secondScreen !== "ABSENT" ||
      photos.some((photo) => photo.slotKey === "secondScreen"),
  );
}

export const commercialApiUrl = (token: string) =>
  `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/public/risk-commercial/${encodeURIComponent(token)}`;

export async function downloadCommercialArchive(token: string) {
  const response = await fetch(`${commercialApiUrl(token)}/archive.zip`);
  if (!response.ok) throw new Error("Téléchargement impossible");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download =
    response.headers
      .get("content-disposition")
      ?.match(/filename="([^"]+)"/i)?.[1] ?? "photos-commerciales.zip";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
