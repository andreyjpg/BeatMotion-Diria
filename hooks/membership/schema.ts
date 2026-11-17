import { parseLocalDate } from "@/constants/helpers";
import zod from "zod";
import { dateTimeSchema } from "../common/schema";

/**
 * public.membership_changes columns renamed to the fields the app uses. A
 * change is a drop (some courses) or a cancel (all of them) that starts on a
 * payment date; pauses come with BM-034.
 */
export const MEMBERSHIP_CHANGE_COLUMNS =
  "id, userId:user_id, kind, courseIds:course_ids, effectiveDate:effective_date, endDate:end_date, status, reason, createdAt:created_at";

export const membershipChangeKindSchema = zod.enum(["drop", "cancel", "pause"]);
export const membershipChangeStatusSchema = zod.enum(["scheduled", "applied", "withdrawn", "ended"]);

/** What the student asks for: a pause isn't offered until BM-034. */
export type RequestedChangeKind = "drop" | "cancel";

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
});

export const membershipChangesSchema = zod.array(membershipChangeSchema);

export type MembershipChange = zod.infer<typeof membershipChangeSchema>;

/**
 * The row request_membership_change and withdraw_membership_change return
 * (snake_case, like every RPC result): only what the screens read from it.
 */
export const membershipChangeResultSchema = zod
  .object({
    id: zod.string(),
    kind: membershipChangeKindSchema,
    effective_date: zod.string(),
  })
  .transform((row) => ({ id: row.id, kind: row.kind, effectiveDate: parseLocalDate(row.effective_date) }));

/**
 * membership_change_preview(): the student's coming payment date, the date a
 * change asked today would start, and why they can't ask for one now (null
 * when they can). cancelBlockedReason only blocks canceling (and dropping
 * every course). Codes are keys of MEMBERSHIP_ERROR_MESSAGES.
 */
export const membershipChangePreviewSchema = zod
  .object({
    payment_date: zod.string().nullable(),
    effective_date: zod.string().nullable(),
    blocked_reason: zod.string().nullable(),
    cancel_blocked_reason: zod.string().nullable(),
  })
  .transform((row) => ({
    paymentDate: parseLocalDate(row.payment_date),
    effectiveDate: parseLocalDate(row.effective_date),
    blockedReason: row.blocked_reason,
    cancelBlockedReason: row.cancel_blocked_reason,
  }));

export type MembershipChangePreview = zod.infer<typeof membershipChangePreviewSchema>;

/** Codes the membership change functions raise (P0001, the code is the message), in Spanish. */
export const MEMBERSHIP_ERROR_MESSAGES: Record<string, string> = {
  NOT_MEMBER: "Ya no estás en ese curso. Actualiza e intenta de nuevo.",
  PAYMENT_LATE: "Tienes un pago atrasado. Ponte al día para hacer cambios.",
  CHANGE_PENDING: "Ya tienes un cambio programado. Deshazlo para pedir otro.",
  ENROLLMENT_PENDING: "Tienes una matrícula en revisión. Podrás cancelar cuando la academia la revise.",
  NO_COURSES: "Elige al menos un curso.",
  INVALID_CHANGE: "Ese cambio no está disponible.",
  CHANGE_NOT_FOUND: "No encontramos ese cambio. Actualiza la pantalla.",
  CHANGE_NOT_SCHEDULED: "Este cambio ya no se puede deshacer.",
};

/** Signed out or deactivated account (42501 from the public functions). */
const ACCOUNT_CANT_CHANGE_MESSAGE = "Tu cuenta no puede hacer cambios. Contacta a la academia.";

/** The Spanish message for an error the database raises on purpose; null for anything unexpected. */
export const membershipErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  const known = MEMBERSHIP_ERROR_MESSAGES[error.message];
  if (known) return known;
  return "code" in error && error.code === "42501" ? ACCOUNT_CANT_CHANGE_MESSAGE : null;
};

export const membershipKeys = {
  allChanges: ["membershipChanges"] as const,
  changes: (userId: string) => ["membershipChanges", userId] as const,
  allPreviews: ["membershipChangePreview"] as const,
  preview: (userId: string) => ["membershipChangePreview", userId] as const,
};

/**
 * Queries a change asked for or undone affects: the change and its preview,
 * the student's courses (payment standing) and their payments.
 */
export const MEMBERSHIP_AFFECTED_KEYS = [
  membershipKeys.allChanges,
  membershipKeys.allPreviews,
  ["myCourses"],
  ["courseDetail"],
  ["courseMember"],
  ["payments"],
] as const;
