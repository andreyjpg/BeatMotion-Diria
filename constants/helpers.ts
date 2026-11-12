const capitalize = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const statusTranslations: { [key: string]: string } = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  ok: "Realizado",
  late: "Atrasado",
  canceled: "Cancelada",
  autoApproved: "Confirmada",
};

const getEnrollmentColor = (status: string) => {
  if (!status) return "text-gray-100";
  if (["approved", "ok"].includes(status)) return "text-green-400";
  if (status === "pending") return "text-yellow-400";
  if (["rejected", "late"].includes(status)) return "text-red-400";
  return "text-gray-100";
};

const formatCurrency = (value: number, currency?: string) => {
  const fallback = `${currency ?? "CRC"} ${value.toLocaleString("es-CR")}`;
  try {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: currency ?? "CRC",
      maximumFractionDigits: 0,
    }).format(value);
  } catch (error) {
    console.error("No se pudo formatear el monto:", error);
    return fallback;
  }
};

const formatDate = (dateString: string | null) => {
  try {
    if (dateString === null) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-CR");
  } catch (error) {
    console.error("No se pudo formatear la fecha:", error);
    return dateString;
  }
};

// ---- Dates and times ------------------------------------------------------
// Postgres `date` columns hold "YYYY-MM-DD" and `time` columns "HH:MM:SS".

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "2026-10-15" -> local Date at midnight. `new Date("2026-10-15")` would be
 * UTC midnight, which in Costa Rica (UTC-6) is the evening of the 14th.
 */
const parseLocalDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

/** "18:30:00" -> "18:30" */
const toHHMM = (value: string | null | undefined): string | null =>
  value ? value.slice(0, 5) : null;

/** Empty form values become NULL instead of an invalid "" date/time. */
const emptyToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Date -> "YYYY-MM-DD" (its local calendar day), as stored in `date` columns. */
const formatYYYYMMDD = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Date -> "DD/MM/YYYY", how dates are shown to users. */
const formatDDMMYYYY = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

/** The last moment of that calendar day: something due on a day lasts all of it. */
const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

/** Date -> "HH:MM" (24-hour), as stored in `time` columns. */
const to24h = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Date -> "6:30 PM", how times are shown to users. */
const to12hLabel = (date: Date) => {
  const hours24 = date.getHours();
  const hours = hours24 % 12 || 12;
  return `${hours}:${pad(date.getMinutes())} ${hours24 >= 12 ? "PM" : "AM"}`;
};

/** "HH:MM" -> a Date today at that time (for time pickers). */
const timeToDate = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
const daysBetween = (from: Date, to: Date) => {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / 86_400_000);
};

const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** "2026-10" -> "oct 2026" (report months). */
const formatMonthLabel = (yearMonth: string) => {
  const [year, month] = yearMonth.split("-").map(Number);
  return month >= 1 && month <= 12
    ? `${MONTHS_SHORT[month - 1]} ${year}`
    : yearMonth;
};

const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Date -> "Lun 27 oct" (headers, cards). */
const formatShortDate = (date: Date) =>
  `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;

/** Date -> "27 oct" (list metadata). */
const formatDayMonth = (date: Date) =>
  `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;

/** Date -> "14 mar 2003" (date fields, birth dates). */
const formatDayMonthYear = (date: Date) =>
  `${formatDayMonth(date)} ${date.getFullYear()}`;

const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const WEEKDAYS_LONG = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/** Date -> "octubre". */
const monthName = (date: Date) => MONTHS_LONG[date.getMonth()];

/** Date -> "jueves 30 de octubre" (deadlines). */
const formatLongDate = (date: Date) =>
  `${WEEKDAYS_LONG[date.getDay()]} ${date.getDate()} de ${MONTHS_LONG[date.getMonth()]}`;

/** Course day as stored ("miércoles") -> "Mié". */
const shortDayName = (day: string | null | undefined) =>
  day ? capitalize(day.trim().slice(0, 3)) : "";

/** "HH:MM" -> "7:00 PM". */
const hhmmTo12h = (value: string | null | undefined) =>
  value ? to12hLabel(timeToDate(value)) : "";

/** When a class is: "Hoy · 7:00 PM", "Lun 27 oct · 7:00 PM" or "Sin fecha". */
const classWhen = (date: string | null, startTime: string | null) => {
  const day = parseLocalDate(date);
  const label =
    date === formatYYYYMMDD(new Date())
      ? "Hoy"
      : day
        ? formatShortDate(day)
        : "Sin fecha";
  return [label, hhmmTo12h(startTime)].filter(Boolean).join(" · ");
};

/** The platform of a class's video link, or null if it isn't a supported one. */
const detectVideoPlatform = (url: string): "youtube" | "vimeo" | null => {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  return null;
};

// ---- Attendance -------------------------------------------------------------

type AttendanceMark = { classId: string; userId: string; attended: boolean };

/** Students marked present per class; classes with nobody present aren't in it. */
const presentByClass = (marks: AttendanceMark[] = []) => {
  const present = new Map<string, number>();
  for (const mark of marks) {
    if (mark.attended) present.set(mark.classId, (present.get(mark.classId) ?? 0) + 1);
  }
  return present;
};

/**
 * A course's attendance as "82%", or "—" with no data. Over the classes where
 * attendance was taken: present marks of current students / (students × classes).
 */
const attendanceRate = (marks: AttendanceMark[] = [], memberIds: Set<string>) => {
  const present = marks.filter((m) => m.attended && memberIds.has(m.userId)).length;
  const possible = memberIds.size * presentByClass(marks).size;
  return possible > 0
    ? `${Math.min(100, Math.round((present / possible) * 100))}%`
    : "—";
};

/** A payment's review status, as shown on chips. */
const paymentStatusLabel: Record<string, string> = {
  pending: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

/** A user's role, as shown to admins. */
const roleLabel: Record<string, string> = {
  user: "Estudiante",
  teacher: "Profesor",
  admin: "Admin",
};

/** A student's monthly payment standing in a course, as shown on chips. */
const standingLabel: Record<string, string> = {
  ok: "Al día",
  pending: "Pendiente",
  late: "Atrasado",
};

/** "Sofía", "Méndez" -> "SM" (avatars without photo). */
const initials = (name?: string | null, lastName?: string | null) =>
  `${name?.trim()[0] ?? ""}${lastName?.trim()[0] ?? ""}`.toUpperCase() || "?";

// ---- Fares ------------------------------------------------------------------

type FareRow = { type: string; fare: number; numCourse: number };

/**
 * Monthly price for a number of courses: the fare with the most courses that
 * still fits the count, so the last plan (3 courses, Plan Diriá) covers any
 * number above it.
 */
const monthlyFareFor = (fares: FareRow[] | undefined, courseCount: number) => {
  const plans = (fares ?? []).filter(
    (f) => f.numCourse > 0 && f.numCourse <= courseCount,
  );
  return plans.reduce((best, f) => (f.numCourse > best.numCourse ? f : best), {
    numCourse: 0,
    fare: 0,
  }).fare;
};

/** The plan a number of courses falls in, as the academy names it. */
const planName = (courseCount: number) => {
  if (courseCount >= 3) return "Plan Diriá";
  return courseCount === 2 ? "Plan 2 días" : "Plan 1 día";
};

/** Days after the due date students can still pay without the late fee (the academy's notice). */
export const LATE_FEE_GRACE_DAYS = 3;

/** Late fee charged for each day after the grace days. */
const lateFeePerDay = (fares: FareRow[] | undefined) =>
  fares?.find((f) => f.type === "late_fee")?.fare ?? 800;

/** Last day a payment due on `dueDate` can be made without the late fee. */
const lastDayWithoutLateFee = (dueDate: Date) =>
  new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate() + LATE_FEE_GRACE_DAYS,
  );

/** Late fee owed today for a payment due on `dueDate` (per day, after the grace days). */
const lateFeeFor = (
  fares: FareRow[] | undefined,
  dueDate: Date | null,
  today = new Date(),
) => {
  if (!dueDate) return { days: 0, amount: 0 };
  const days = Math.max(0, daysBetween(dueDate, today) - LATE_FEE_GRACE_DAYS);
  return { days, amount: days * lateFeePerDay(fares) };
};

/** The annual fee isn't charged in November and December. */
const isAnnualFeeExemptMonth = (date = new Date()) => date.getMonth() >= 10;

/** Postgres unique_violation (e.g. a second live enrollment in the same course). */
const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

export const sanitizeVimeoUrl = (url: string) => {
  const match = url.match(/(?:vimeo\.com\/(?:video\/)?)(\d+)/);
  return match ? match[1] : null;
};

export const sanitizeYouTubeUrl = (url: string) => {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : null;
};

/** "8606-1644" -> "86061644": sign-up accepts phones in any format. */
const digitsOnly = (value: string) => value.replace(/\D/g, "");

/** "1 curso", "3 cursos". */
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Lun" for a date. */
const weekdayShort = (date: Date) => WEEKDAYS_SHORT[date.getDay()];

/** "oct" for a date. */
const monthShort = (date: Date) => MONTHS_SHORT[date.getMonth()];

// ---- Birth dates ------------------------------------------------------------
// Ages count calendar days on the phone, which is Costa Rica time for the
// academy (like every date helper here).

/**
 * Day of `year` on which someone born on `birth` has their birthday. A 29 Feb
 * birthday is on 28 Feb when the year isn't a leap year.
 */
const birthdayIn = (birth: Date, year: number) => {
  const isLeapYear = new Date(year, 1, 29).getMonth() === 1;
  const bornOnLeapDay = birth.getMonth() === 1 && birth.getDate() === 29;
  return new Date(year, birth.getMonth(), bornOnLeapDay && !isLeapYear ? 28 : birth.getDate());
};

/**
 * Whole years someone born on `birthDate` ("YYYY-MM-DD") has on `date`
 * (default today); null without a valid birth date or before it. They turn a
 * year older on `birthdayIn` that year.
 */
const ageOn = (birthDate: string | null | undefined, date = new Date()) => {
  const birth = parseLocalDate(birthDate);
  if (!birth) return null;
  const hadBirthday = date >= birthdayIn(birth, date.getFullYear());
  const age = date.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1);
  return age >= 0 ? age : null;
};

/** "2003-03-14" -> "23 años" on `date` (default today); null without a valid birth date. */
const ageLabel = (birthDate: string | null | undefined, date = new Date()) => {
  const age = ageOn(birthDate, date);
  return age === null ? null : plural(age, "año", "años");
};

/**
 * A student's age where staff always expect one (Usuarios, Matrículas): "23 años",
 * or "—" without a valid birth date.
 */
const ageOrDash = (birthDate: string | null | undefined, date = new Date()) =>
  ageLabel(birthDate, date) ?? "—";

/** "2003-03-14" -> "14 mar 2003 · 23 años" on `date` (default today); null without a valid birth date. */
const formatBirthDate = (birthDate: string | null | undefined, date = new Date()) => {
  const birth = parseLocalDate(birthDate);
  const age = ageLabel(birthDate, date);
  return birth && age ? `${formatDayMonthYear(birth)} · ${age}` : null;
};

export const PRIVACY_POLICY_URL = "https://beatmotion-politica-privacidad.netlify.app";

export {
  ageLabel,
  ageOn,
  ageOrDash,
  attendanceRate,
  birthdayIn,
  capitalize,
  classWhen,
  daysBetween,
  detectVideoPlatform,
  digitsOnly,
  emptyToNull,
  endOfDay,
  formatBirthDate,
  formatCurrency,
  formatDate,
  formatDayMonth,
  formatDayMonthYear,
  formatDDMMYYYY,
  formatLongDate,
  formatMonthLabel,
  formatShortDate,
  formatYYYYMMDD,
  getEnrollmentColor,
  hhmmTo12h,
  initials,
  isAnnualFeeExemptMonth,
  isUniqueViolation,
  lastDayWithoutLateFee,
  lateFeeFor,
  lateFeePerDay,
  monthlyFareFor,
  monthName,
  monthShort,
  parseLocalDate,
  paymentStatusLabel,
  planName,
  plural,
  presentByClass,
  roleLabel,
  shortDayName,
  standingLabel,
  statusTranslations,
  timeToDate,
  to12hLabel,
  to24h,
  toHHMM,
  weekdayShort,
};
