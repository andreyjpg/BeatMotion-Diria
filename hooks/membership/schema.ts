import { parseLocalDate } from "@/constants/helpers";
import zod from "zod";
import { dateTimeSchema } from "../common/schema";

/**
 * public.membership_changes columns renamed to the fields the app uses. A
 * change is a drop (some courses), a cancel (all of them) or a pause (all of
 * them, until end_date) that starts on a payment date. endedAt is when a
 * pause really ended: its end date, or the day the student came back early.
 * createdBy is who asked (the student, or an admin for them); withdrawnBy who
 * undid it (null: the daily job, for a pause that didn't start); endedBy who
 * ended a pause early (null: it ended on its date).
 */
export const MEMBERSHIP_CHANGE_COLUMNS =
  "id, userId:user_id, kind, courseIds:course_ids, effectiveDate:effective_date, endDate:end_date, status, reason, createdAt:created_at, endedAt:ended_at, createdBy:created_by, withdrawnBy:withdrawn_by, withdrawnAt:withdrawn_at, endedBy:ended_by";

/**
 * The same columns for an admin's history of a student, with the people who
 * asked, undid and ended each change (admins read every profile).
 */
export const ADMIN_MEMBERSHIP_CHANGE_COLUMNS =
  "id, userId:user_id, kind, courseIds:course_ids, effectiveDate:effective_date, endDate:end_date, status, reason, createdAt:created_at, endedAt:ended_at, createdBy:created_by, withdrawnBy:withdrawn_by, withdrawnAt:withdrawn_at, endedBy:ended_by, creator:profiles!membership_changes_created_by_fkey(name, lastName:last_name, role), withdrawer:profiles!membership_changes_withdrawn_by_fkey(name, lastName:last_name, role), ender:profiles!membership_changes_ended_by_fkey(name, lastName:last_name, role)";

export const membershipChangeKindSchema = zod.enum(["drop", "cancel", "pause"]);
export const membershipChangeStatusSchema = zod.enum(["scheduled", "applied", "withdrawn", "ended"]);

/** What the student asks for: dropping some courses, canceling, or pausing every course. */
export type RequestedChangeKind = zod.infer<typeof membershipChangeKindSchema>;

/**
 * A student's change in progress, for the admin's chips: a pause that started,
 * or the one change waiting for its date.
 */
export const liveMembershipChangeSchema = zod.enum(["paused", "pauseScheduled", "cancelScheduled", "dropScheduled"]);
export type LiveMembershipChange = zod.infer<typeof liveMembershipChangeSchema>;

/** How long a pause can be, in months (request_membership_change allows 1 to 3). */
export const PAUSE_MONTHS = [1, 2, 3] as const;
export type PauseMonths = (typeof PAUSE_MONTHS)[number];

type MembershipChangeRow = { effectiveDate: string; endDate: string | null };

/** effective_date and end_date are calendar days: read them as local dates, not UTC. */
export const toMembershipChange = <T extends MembershipChangeRow>(row: T) => ({
  ...row,
  effectiveDate: parseLocalDate(row.effectiveDate),
  endDate: parseLocalDate(row.endDate),
});

export const membershipChangeSchema = zod.object({
  id: zod.string(),
  userId: zod.string(),
  kind: membershipChangeKindSchema,
  courseIds: zod.array(zod.string()),
  effectiveDate: zod.date(), // local date from toMembershipChange
  endDate: zod.date().nullable(), // local date from toMembershipChange
  status: membershipChangeStatusSchema,
  reason: zod.string().nullable(),
  createdAt: dateTimeSchema,
  endedAt: dateTimeSchema.nullable(),
  createdBy: zod.string().nullable(),
  withdrawnBy: zod.string().nullable(),
  withdrawnAt: dateTimeSchema.nullable(),
  endedBy: zod.string().nullable(),
});

export const membershipChangesSchema = zod.array(membershipChangeSchema);

export type MembershipChange = zod.infer<typeof membershipChangeSchema>;

/** Someone in an admin's history: the student, or an admin. Null when that account was deleted. */
const changePersonSchema = zod
  .object({ name: zod.string(), lastName: zod.string(), role: zod.enum(["user", "teacher", "admin"]) })
  .nullable();

export type ChangePerson = zod.infer<typeof changePersonSchema>;

/** A change in an admin's history of a student, with who asked, undid and ended it. */
export const adminMembershipChangeSchema = membershipChangeSchema.extend({
  creator: changePersonSchema,
  withdrawer: changePersonSchema,
  ender: changePersonSchema,
});

export const adminMembershipChangesSchema = zod.array(adminMembershipChangeSchema);

export type AdminMembershipChange = zod.infer<typeof adminMembershipChangeSchema>;

/**
 * The row request_membership_change, withdraw_membership_change, end_pause and
 * their admin_* versions return (snake_case, like every RPC result): only what
 * the screens read from it. An admin's change dated today comes back 'applied'.
 */
export const membershipChangeResultSchema = zod
  .object({
    id: zod.string(),
    kind: membershipChangeKindSchema,
    status: membershipChangeStatusSchema,
    effective_date: zod.string(),
    end_date: zod.string().nullable(),
  })
  .transform((row) => ({
    id: row.id,
    kind: row.kind,
    status: row.status,
    effectiveDate: parseLocalDate(row.effective_date),
    endDate: parseLocalDate(row.end_date),
  }));

/** "YYYY-MM-DD" strings -> local dates, leaving out any that don't parse. */
const toLocalDates = (values: string[] | null) =>
  (values ?? []).map((value) => parseLocalDate(value)).filter((date): date is Date => date !== null);

/**
 * membership_change_preview(): the student's coming payment date, the date a
 * change asked today would start, and why they can't ask for one now (null
 * when they can). cancelBlockedReason only blocks canceling (and dropping
 * every course), pauseBlockedReason only pausing. pauseEndDates are the end
 * of a pause of 1, 2 and 3 months (PAUSE_MONTHS order); nextPauseDate, with
 * PAUSE_YEAR_LIMIT, the first payment date a pause could start on. Codes are
 * keys of MEMBERSHIP_ERROR_MESSAGES.
 */
export const membershipChangePreviewSchema = zod
  .object({
    payment_date: zod.string().nullable(),
    effective_date: zod.string().nullable(),
    blocked_reason: zod.string().nullable(),
    cancel_blocked_reason: zod.string().nullable(),
    pause_blocked_reason: zod.string().nullable(),
    pause_end_dates: zod.array(zod.string()).nullable(),
    next_pause_date: zod.string().nullable(),
  })
  .transform((row) => ({
    paymentDate: parseLocalDate(row.payment_date),
    effectiveDate: parseLocalDate(row.effective_date),
    blockedReason: row.blocked_reason,
    cancelBlockedReason: row.cancel_blocked_reason,
    pauseBlockedReason: row.pause_blocked_reason,
    pauseEndDates: toLocalDates(row.pause_end_dates),
    nextPauseDate: parseLocalDate(row.next_pause_date),
  }));

export type MembershipChangePreview = zod.infer<typeof membershipChangePreviewSchema>;

/**
 * admin_membership_change_preview(student): the student's payment date, the
 * date an admin's change would start (that payment date, or today when it
 * passed), why an admin can't make one now and why they can't cancel or pause
 * (null when they can), the end of a pause of 1, 2 and 3 months, and the
 * unpaid payment date a pause from today wouldn't charge.
 */
export const adminMembershipChangePreviewSchema = zod
  .object({
    payment_date: zod.string().nullable(),
    effective_date: zod.string().nullable(),
    blocked_reason: zod.string().nullable(),
    cancel_blocked_reason: zod.string().nullable(),
    pause_end_dates: zod.array(zod.string()).nullable(),
    owed_payment_date: zod.string().nullable(),
  })
  .transform((row) => ({
    paymentDate: parseLocalDate(row.payment_date),
    effectiveDate: parseLocalDate(row.effective_date),
    blockedReason: row.blocked_reason,
    cancelBlockedReason: row.cancel_blocked_reason,
    pauseEndDates: toLocalDates(row.pause_end_dates),
    owedPaymentDate: parseLocalDate(row.owed_payment_date),
  }));

export type AdminMembershipChangePreview = zod.infer<typeof adminMembershipChangePreviewSchema>;

/** Codes the membership change functions raise (P0001, the code is the message), in Spanish. */
export const MEMBERSHIP_ERROR_MESSAGES: Record<string, string> = {
  NOT_MEMBER: "Ya no estás en ese curso. Actualiza e intenta de nuevo.",
  PAYMENT_LATE: "Tienes un pago atrasado. Ponte al día para hacer cambios.",
  CHANGE_PENDING: "Ya tienes un cambio programado. Deshazlo para pedir otro.",
  ENROLLMENT_PENDING: "Tienes una matrícula en revisión. Podrás cancelar o pausar cuando la academia la revise.",
  MEMBERSHIP_PAUSED: "Tu membresía está en pausa. Termina la pausa para hacer otros cambios.",
  PAUSE_YEAR_LIMIT: "Ya usaste tu pausa de este año.",
  INVALID_PAUSE_LENGTH: "Elige una pausa de 1, 2 o 3 meses.",
  NOT_PAUSED: "Tu membresía ya no está en pausa. Actualiza la pantalla.",
  NO_COURSES: "Elige al menos un curso.",
  INVALID_CHANGE: "Ese cambio no está disponible.",
  CHANGE_NOT_FOUND: "No encontramos ese cambio. Actualiza la pantalla.",
  CHANGE_NOT_SCHEDULED: "Este cambio ya no se puede deshacer.",
  CHANGE_BY_ADMIN: "La academia programó este cambio. Escríbenos si quieres deshacerlo.",
};

/** The same codes, as an admin reads them about a student. */
export const ADMIN_MEMBERSHIP_ERROR_MESSAGES: Record<string, string> = {
  NOT_MEMBER: "El estudiante ya no tiene ese curso. Actualiza e intenta de nuevo.",
  CHANGE_PENDING: "El estudiante ya tiene un cambio programado. Deshazlo para hacer otro.",
  ENROLLMENT_PENDING: "El estudiante tiene una matrícula en revisión. Revísala antes de cancelar o pausar.",
  MEMBERSHIP_PAUSED: "La membresía está en pausa. Termina la pausa para hacer otros cambios.",
  INVALID_PAUSE_LENGTH: "Elige una pausa de 1, 2 o 3 meses.",
  NOT_PAUSED: "La membresía ya no está en pausa. Actualiza la pantalla.",
  NO_COURSES: "Elige al menos un curso.",
  INVALID_CHANGE: "Ese cambio no está disponible.",
  CHANGE_NOT_FOUND: "No encontramos ese cambio. Actualiza la pantalla.",
  CHANGE_NOT_SCHEDULED: "Este cambio ya no se puede deshacer.",
};

/** Signed out or deactivated account (42501 from the public functions). */
const ACCOUNT_CANT_CHANGE_MESSAGE = "Tu cuenta no puede hacer cambios. Contacta a la academia.";

/** Not an admin, or a deactivated one (42501 from the admin functions). */
const ADMIN_ONLY_MESSAGE = "Solo un admin activo puede hacer este cambio.";

const isPermissionError = (error: Error) => "code" in error && error.code === "42501";

/** The Spanish message for an error the database raises on purpose; null for anything unexpected. */
export const membershipErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  const known = MEMBERSHIP_ERROR_MESSAGES[error.message];
  if (known) return known;
  return isPermissionError(error) ? ACCOUNT_CANT_CHANGE_MESSAGE : null;
};

/** The same, for an admin acting for a student; null for anything unexpected. */
export const adminMembershipErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  const known = ADMIN_MEMBERSHIP_ERROR_MESSAGES[error.message];
  if (known) return known;
  return isPermissionError(error) ? ADMIN_ONLY_MESSAGE : null;
};

export const membershipKeys = {
  allChanges: ["membershipChanges"] as const,
  changes: (userId: string) => ["membershipChanges", userId] as const,
  /** An admin's history of a student (with the people). */
  changesByUser: (userId: string) => ["membershipChanges", "byUser", userId] as const,
  allPreviews: ["membershipChangePreview"] as const,
  preview: (userId: string) => ["membershipChangePreview", userId] as const,
  /** What an admin's change for a student would mean. */
  adminPreview: (userId: string) => ["membershipChangePreview", "admin", userId] as const,
};

/**
 * Queries a change asked for, undone or ended affects: the change and its
 * preview, the student's courses (payment standing, paused_until) and their
 * payments (the home and Pagos read both), the course rosters, and the admin's
 * user list (its change chip).
 */
export const MEMBERSHIP_AFFECTED_KEYS = [
  membershipKeys.allChanges,
  membershipKeys.allPreviews,
  ["myCourses"],
  ["courseDetail"],
  ["courseMember"],
  ["membersByCourse"],
  ["payments"],
  ["users"],
] as const;
