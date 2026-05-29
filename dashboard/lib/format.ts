export function formatMoney(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(numberValue);
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

export function normalizeLicensePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export function formatLicensePlate(value: string | null | undefined) {
  const normalized = normalizeLicensePlate(value ?? "");

  if (normalized.length <= 2) {
    return normalized;
  }

  if (normalized.length <= 5) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  }

  return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`;
}
