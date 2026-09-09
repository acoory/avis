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
    key: "interior-front",
    label: "Habitacle avant",
    group: "Intérieur",
    hint: "Montrer les sièges avant et le tableau de bord.",
  },
  {
    key: "interior-rear",
    label: "Places arrière",
    group: "Intérieur",
    hint: "Montrer les sièges et leur état.",
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
