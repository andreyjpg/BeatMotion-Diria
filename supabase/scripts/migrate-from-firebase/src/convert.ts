// Lenient converters for Firestore values, which were written by different
// versions of the app over time (Timestamps, Dates, strings, numbers...).

const COSTA_RICA_OFFSET_MS = -6 * 60 * 60 * 1000; // UTC-6, no daylight saving time

const pad = (n: number) => String(n).padStart(2, "0");

export function str(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

export function truncate(value: string | null, max: number): string | null {
  return value != null && value.length > max ? value.slice(0, max) : value;
}

export function bool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function num(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function int(value: unknown): number | null {
  const n = num(value);
  return n == null ? null : Math.trunc(n);
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object") {
    const v = value as {
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
      nanoseconds?: number;
      _nanoseconds?: number;
    };
    if (typeof v.toDate === "function") return v.toDate();
    const seconds = v.seconds ?? v._seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000 + (v.nanoseconds ?? v._nanoseconds ?? 0) / 1e6);
    }
    return null;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** ISO timestamp, or undefined so the column keeps its default. */
export function iso(value: unknown): string | undefined {
  return toDate(value)?.toISOString();
}

/** ISO timestamp, or null to store an explicit "no value". */
export function isoOrNull(value: unknown): string | null {
  return toDate(value)?.toISOString() ?? null;
}

/**
 * Calendar day (YYYY-MM-DD) for a date-like value. Dates computed by the old
 * Cloud Functions (e.g. nextPaymentDate) were stored at midnight UTC, so those
 * keep their UTC day; any other timestamp is read in Costa Rica time.
 */
export function toDay(value: unknown): string | null {
  if (typeof value === "string") {
    const parsed = parseDayString(value);
    if (parsed) return parsed;
  }
  const date = toDate(value);
  if (!date) return null;
  const utcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;
  const local = utcMidnight ? date : new Date(date.getTime() + COSTA_RICA_OFFSET_MS);
  return local.toISOString().slice(0, 10);
}

/** "2026-10-05", or "5/10/2026" / "05-10-2026" (day first, as written in Costa Rica). */
export function parseDayString(value: string): string | null {
  const text = value.trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return validDay(+match[1], +match[2], +match[3]);
  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return validDay(+match[3], +match[2], +match[1]);
  return null;
}

function validDay(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Free-text class times: "18:00", "6:30 pm", "6pm", "18h", "18.30" -> "HH:MM". */
export function parseTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let text = value.trim().toLowerCase().replace(/\s+/g, "");
  if (!text) return null;
  text = text
    .replace(/a\.?m\.?$/, "am")
    .replace(/p\.?m\.?$/, "pm")
    .replace(/(hrs?|h)$/, "")
    .replace(".", ":");
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?(am|pm)?$/);
  if (!match) return null;

  let hours = +match[1];
  const minutes = match[2] ? +match[2] : 0;
  const meridiem = match[3];
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "pm" && hours !== 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
  }
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

const WEEKDAYS: Record<string, string> = {
  lunes: "lunes",
  martes: "martes",
  miercoles: "miércoles",
  jueves: "jueves",
  viernes: "viernes",
  sabado: "sábado",
  domingo: "domingo",
};

/** Course day names, tolerant of case and missing accents ("Miercoles" -> "miércoles"). */
export function toWeekday(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return WEEKDAYS[key] ?? null;
}

/** For matching a course's teacher name to a user: "José  Pérez" == "jose perez". */
export function normalizeName(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
}
