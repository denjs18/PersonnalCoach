import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/* ------------------------------- Dates ---------------------------------- */

/** Aujourd'hui au format YYYY-MM-DD, dans le fuseau de l'utilisateur. */
export function todayISO(timeZone = "Europe/Paris"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Convertit "2026-08-22" en Date locale (sans décalage de fuseau). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "sam. 22 août" */
export function formatShortDate(iso: string): string {
  return capitalize(
    parseISODate(iso).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
  );
}

/** "Samedi 22 août 2026" */
export function formatLongDate(iso: string): string {
  return capitalize(
    parseISODate(iso).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );
}

/** "Aujourd'hui", "Demain", "Hier" ou la date courte. */
export function formatRelativeDay(iso: string, today = todayISO()): string {
  if (iso === today) return "Aujourd'hui";
  if (iso === addDaysISO(today, 1)) return "Demain";
  if (iso === addDaysISO(today, -1)) return "Hier";
  return formatShortDate(iso);
}

/** Suite de `count` jours consécutifs à partir de `startISO`. */
export function buildDays(count: number, startISO: string): string[] {
  return Array.from({ length: count }, (_, i) => addDaysISO(startISO, i));
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime();
  return Math.round(ms / 86_400_000);
}

/** Lundi de la semaine contenant `iso`. */
export function startOfWeekISO(iso: string): string {
  const date = parseISODate(iso);
  const day = (date.getDay() + 6) % 7; // lundi = 0
  date.setDate(date.getDate() - day);
  return toISODate(date);
}

/* ------------------------------ Formatage -------------------------------- */

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${rem}s`;
  if (rem === 0) return `${m} min`;
  return `${m}min${String(rem).padStart(2, "0")}`;
}

export function formatWeight(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return "—";
  return Number.isInteger(kg) ? `${kg} kg` : `${kg.toFixed(1).replace(".", ",")} kg`;
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return "—";
  return meters >= 1000 ? `${(meters / 1000).toFixed(2).replace(".", ",")} km` : `${meters} m`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`;
}

/** Volume d'une série : reps × poids (0 si l'un des deux manque). */
export function setVolume(reps: number | null, weightKg: number | null): number {
  if (!reps || !weightKg) return 0;
  return reps * weightKg;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
