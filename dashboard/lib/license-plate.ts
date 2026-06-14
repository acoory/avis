export const licensePlateCountries = [
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "DE", label: "Allemagne" },
  { code: "ES", label: "Espagne" },
  { code: "IT", label: "Italie" },
  { code: "NL", label: "Pays-Bas" },
  { code: "LU", label: "Luxembourg" },
  { code: "CH", label: "Suisse" },
  { code: "GB", label: "Royaume-Uni" },
  { code: "PT", label: "Portugal" },
  { code: "PL", label: "Pologne" },
  { code: "RO", label: "Roumanie" },
  { code: "CZ", label: "Tchequie" },
  { code: "AT", label: "Autriche" },
  { code: "DK", label: "Danemark" },
  { code: "SE", label: "Suede" },
  { code: "NO", label: "Norvege" },
  { code: "IE", label: "Irlande" },
  { code: "UA", label: "Ukraine" },
  { code: "MA", label: "Maroc" },
  { code: "DZ", label: "Algerie" },
  { code: "TN", label: "Tunisie" },
  { code: "UNKNOWN", label: "Autre / inconnu" },
] as const;

export function normalizeLicensePlate(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 15);
}

export function sanitizeLicensePlateInput(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 20);
}

export function formatLicensePlate(
  value: string | null | undefined,
  country = "FR",
  rawValue?: string | null,
) {
  const normalized = normalizeLicensePlate(value ?? "");

  if (country === "FR" && /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`;
  }

  if (country === "BE" && /^[12][A-Z]{3}\d{3}$/.test(normalized)) {
    return `${normalized.slice(0, 1)}-${normalized.slice(1, 4)}-${normalized.slice(4)}`;
  }

  return sanitizeLicensePlateInput(rawValue ?? value ?? "").trim() || normalized;
}

export function detectLicensePlateCountry(value: string, fallbackCountry: string) {
  const normalized = normalizeLicensePlate(value);

  if (/^[A-HJ-NP-TV-Z]{2}\d{3}[A-HJ-NP-TV-Z]{2}$/.test(normalized)) {
    return "FR";
  }

  if (/^[12][A-Z]{3}\d{3}$/.test(normalized)) {
    return "BE";
  }

  return fallbackCountry;
}

export function extractLicensePlateCandidate(text: string, country: string) {
  const candidates = text
    .toUpperCase()
    .split(/\r?\n/)
    .flatMap((line) => [line, ...line.split(/\s{2,}/)])
    .map(sanitizeLicensePlateInput)
    .map((raw) => ({ raw: raw.trim(), normalized: normalizeLicensePlate(raw) }))
    .filter(({ normalized }) => normalized.length >= 4 && normalized.length <= 15);

  const scored = candidates.map((candidate) => ({
    ...candidate,
    score: scoreCandidate(candidate.normalized, country),
  }));

  return scored.sort((left, right) => right.score - left.score)[0] ?? null;
}

function scoreCandidate(value: string, country: string) {
  let score = 0;

  if (/[A-Z]/.test(value) && /\d/.test(value)) score += 30;
  if (value.length >= 6 && value.length <= 9) score += 25;
  if (country === "FR" && /^[A-HJ-NP-TV-Z]{2}\d{3}[A-HJ-NP-TV-Z]{2}$/.test(value)) score += 60;
  if (country === "BE" && /^[12][A-Z]{3}\d{3}$/.test(value)) score += 60;
  if (/^[A-Z0-9]+$/.test(value)) score += 10;

  return score;
}
