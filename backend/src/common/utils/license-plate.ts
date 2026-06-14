export function normalizeLicensePlate(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 15);
}

export function sanitizeLicensePlateRaw(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
}

export function normalizeLicensePlateCountry(value: string | null | undefined) {
  const country = value?.trim().toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) ? country : 'UNKNOWN';
}

export function formatLicensePlate(
  value: string,
  country = 'FR',
  rawValue?: string | null,
) {
  const normalized = normalizeLicensePlate(value);

  if (country === 'FR' && /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`;
  }

  if (country === 'BE' && /^[12][A-Z]{3}\d{3}$/.test(normalized)) {
    return `${normalized.slice(0, 1)}-${normalized.slice(1, 4)}-${normalized.slice(4)}`;
  }

  return sanitizeLicensePlateRaw(rawValue ?? value) || normalized;
}
