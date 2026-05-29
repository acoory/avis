export function normalizeLicensePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

export function formatLicensePlate(value: string) {
  const normalized = normalizeLicensePlate(value);

  if (normalized.length <= 2) return normalized;
  if (normalized.length <= 5) return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;

  return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`;
}
