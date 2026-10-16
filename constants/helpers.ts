const capitalize = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const statusTranslations: { [key: string]: string } = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  ok: "Realizado",
  late: "Atrasado",
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

/** Date -> "HH:MM" (24-hour), as stored in `time` columns. */
const to24h = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

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

export const sanitizeVimeoUrl = (url: string) => {
  const match = url.match(/(?:vimeo\.com\/(?:video\/)?)(\d+)/);
  return match ? match[1] : null;
};

export const sanitizeYouTubeUrl = (url: string) => {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

export {
  capitalize,
  emptyToNull,
  formatCurrency,
  formatDate,
  formatDDMMYYYY,
  formatYYYYMMDD,
  getEnrollmentColor,
  parseLocalDate,
  statusTranslations,
  timeToDate,
  to12hLabel,
  to24h,
  toHHMM,
};
