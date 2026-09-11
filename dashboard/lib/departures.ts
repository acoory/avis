import { Departure, DepartureStatus } from "@/types/departures";

export function formatRegistration(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(normalized)
    ? `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}` : normalized;
}
export function dayDiff(from: string | Date, to: string | Date = new Date()) {
  const start = new Date(from); const end = new Date(to);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}
export function absenceLabel(departure: Departure) {
  if (!departure.departedAt) return null;
  const days = dayDiff(departure.departedAt, departure.returnedAt ?? new Date());
  if (days === 0) return "Parti aujourd’hui";
  return `Parti depuis ${days} jour${days > 1 ? "s" : ""}`;
}
export function overdueDays(departure: Departure) {
  if (!departure.estimatedReturnAt || departure.returnedAt) return 0;
  const due = new Date(departure.estimatedReturnAt);
  return due.getTime() < Date.now() ? Math.max(1, dayDiff(due)) : 0;
}
export function isAway(status: DepartureStatus) {
  return ["DEPARTED", "AT_PROVIDER", "WORK_IN_PROGRESS", "READY_FOR_PICKUP", "PICKUP_PLANNED"].includes(status);
}
export function shortDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(new Date(value)) : null;
}
export function longDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}
