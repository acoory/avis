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
  return normalizeInternationalLicensePlate(value);
}

export function formatLicensePlate(
  value: string | null | undefined,
  country = "FR",
  rawValue?: string | null,
) {
  return formatInternationalLicensePlate(value, country, rawValue);
}
import {
  formatLicensePlate as formatInternationalLicensePlate,
  normalizeLicensePlate as normalizeInternationalLicensePlate,
} from "@/lib/license-plate";
