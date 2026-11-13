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

/** Monday and Sunday (local midnight) of the week `date` (default today) is in. */
const weekOf = (date = new Date()) => {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start, end };
};

/** "Lun 19 – dom 25 oct", or "Lun 27 oct – dom 2 nov" when the range spans two months. */
const formatDayRange = (start: Date, end: Date) => {
  const isSameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = `${weekdayShort(start)} ${isSameMonth ? start.getDate() : formatDayMonth(start)}`;
  return `${startLabel} – ${weekdayShort(end).toLowerCase()} ${formatDayMonth(end)}`;
};

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
 * The day from `start` to `end` (inclusive, at most a year apart, e.g. a week)
 * on which someone born on `birthDate` ("YYYY-MM-DD") has a birthday, or null.
 * Both years are checked, so a week from 29 Dec to 4 Jan finds either side.
 * The day they were born isn't a birthday.
 */
const birthdayBetween = (birthDate: string | null | undefined, start: Date, end: Date) => {
  const birth = parseLocalDate(birthDate);
  if (!birth) return null;
  const birthdays = [start.getFullYear(), end.getFullYear()]
    .filter((year) => year > birth.getFullYear())
    .map((year) => birthdayIn(birth, year));
  return birthdays.find((day) => day >= start && day <= end) ?? null;
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

/**
 * Age groups of the age charts (the course screens and Estadísticas), youngest
 * first. Each group goes up to `maxAge`, inclusive.
 */
const AGE_GROUPS = [
  { key: "under18", label: "<18", spokenLabel: "menores de 18", maxAge: 17 },
  { key: "18to25", label: "18–25", spokenLabel: "de 18 a 25", maxAge: 25 },
  { key: "26to35", label: "26–35", spokenLabel: "de 26 a 35", maxAge: 35 },
  { key: "36to45", label: "36–45", spokenLabel: "de 36 a 45", maxAge: 45 },
  { key: "46plus", label: "46+", spokenLabel: "de 46 o más", maxAge: Number.POSITIVE_INFINITY },
] as const;

type AgeGroup = (typeof AGE_GROUPS)[number];

/** How the ages of a group of people spread over AGE_GROUPS. */
type AgeSummary = {
  /** Every group of AGE_GROUPS, in order, with how many people fall in it. */
  groups: (AgeGroup & { count: number })[];
  /** People without a valid birth date: left out of the groups and the average. */
  withoutBirthDate: number;
  /** Rounded mean age of the people counted; null when nobody has a birth date. */
  averageAge: number | null;
  youngestAge: number | null;
  oldestAge: number | null;
};

/** The group of AGE_GROUPS that `age` falls in. */
const ageGroupOf = (age: number): AgeGroup =>
  AGE_GROUPS.find((group) => age <= group.maxAge) ?? AGE_GROUPS[AGE_GROUPS.length - 1];

/**
 * Ages on `date` (default today) of the people born on `birthDates`
 * ("YYYY-MM-DD"), counted per AGE_GROUPS. A missing or invalid birth date only
 * adds to `withoutBirthDate`.
 */
const summarizeAges = (birthDates: (string | null | undefined)[], date = new Date()): AgeSummary => {
  const ages = birthDates
    .map((birthDate) => ageOn(birthDate, date))
    .filter((age): age is number => age !== null);
  const hasAges = ages.length > 0;
  return {
    groups: AGE_GROUPS.map((group) => ({
      ...group,
      count: ages.filter((age) => ageGroupOf(age) === group).length,
    })),
    withoutBirthDate: birthDates.length - ages.length,
    averageAge: hasAges ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : null,
    youngestAge: hasAges ? Math.min(...ages) : null,
    oldestAge: hasAges ? Math.max(...ages) : null,
  };
};

/** Line under an age chart: "2 estudiantes sin fecha de nacimiento no aparecen en el gráfico."; null with none. */
const withoutBirthDateNote = (count: number) => {
  if (count === 0) return null;
  if (count === 1) return "1 estudiante sin fecha de nacimiento no aparece en el gráfico.";
  return `${count} estudiantes sin fecha de nacimiento no aparecen en el gráfico.`;
};

export const PRIVACY_POLICY_URL = "https://beatmotion-politica-privacidad.netlify.app";

export type { AgeGroup, AgeSummary };

export {
  AGE_GROUPS,
  ageGroupOf,
  ageLabel,
  ageOn,
  ageOrDash,
  attendanceRate,
  birthdayBetween,
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
  formatDayRange,
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
  summarizeAges,
  timeToDate,
  to12hLabel,
  to24h,
  toHHMM,
  weekdayShort,
  weekOf,
  withoutBirthDateNote,
};
