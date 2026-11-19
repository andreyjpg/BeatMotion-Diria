import { addDays, formatYYYYMMDD } from "@/constants/helpers";
import type { MembershipChange } from "./schema";

// What a scheduled drop, cancel or pause means for the student's courses and
// their monthly payment. The database decides the dates (membership_change_preview,
// membership_changes.effective_date and end_date); these only read them. Dates
// are local midnights (parseLocalDate), so they compare by calendar day.

/** The change waiting for its date, if any: the database allows one at a time. */
export const scheduledChangeOf = (changes: MembershipChange[] | undefined) =>
  changes?.find((change) => change.status === "scheduled") ?? null;

/** The pause that has started and not ended, if any: the student is paused now. */
export const activePauseOf = (changes: MembershipChange[] | undefined) =>
  changes?.find((change) => change.kind === "pause" && change.status === "applied") ?? null;

/** Whether `change` is a pause that starts on or before `dueDate`, so that payment isn't charged. */
export const pauseCoversDate = (change: MembershipChange | null, dueDate: Date | null) =>
  change?.kind === "pause" && !!dueDate && change.effectiveDate.getTime() <= dueDate.getTime();

/** The next payment the student is charged: after a scheduled pause that covers `dueDate`, its end. */
export const nextChargedDate = (dueDate: Date | null, change: MembershipChange | null) =>
  pauseCoversDate(change, dueDate) ? (change?.endDate ?? dueDate) : dueDate;

/** Whether a membership paused until `pausedUntil` is paused on that day ("YYYY-MM-DD"): back on its end date. */
export const isPausedOn = (pausedUntil: Date | null, dateKey: string) =>
  !!pausedUntil && dateKey < formatYYYYMMDD(pausedUntil);

/** Days a pause covered, as "YYYY-MM-DD": from `from` up to `until`, which isn't included. */
export type PauseRange = { from: string; until: string };

/**
 * The days the student was or is paused: every pause that started, from its
 * start to the day they came back (early, or on its end date).
 */
export const pauseRangesOf = (changes: MembershipChange[] | undefined): PauseRange[] =>
  (changes ?? []).flatMap((change) => {
    if (change.kind !== "pause" || !change.endDate) return [];
    if (change.status !== "applied" && change.status !== "ended") return [];
    const plannedEnd = formatYYYYMMDD(change.endDate);
    const cameBack = change.status === "ended" && change.endedAt ? formatYYYYMMDD(change.endedAt) : plannedEnd;
    return [{ from: formatYYYYMMDD(change.effectiveDate), until: cameBack < plannedEnd ? cameBack : plannedEnd }];
  });

/** Why the student can't send an enrollment request now, as the code request_enrollment raises; null when they can. */
export const enrollmentBlockOf = (changes: MembershipChange[] | undefined) => {
  if (activePauseOf(changes)) return "MEMBERSHIP_PAUSED";
  const scheduled = scheduledChangeOf(changes);
  if (scheduled?.kind === "pause") return "PAUSE_SCHEDULED";
  if (scheduled?.kind === "cancel") return "CANCEL_SCHEDULED";
  return null;
};

/**
 * The student's due date: the earliest next payment date of their courses.
 * New courses share the student's date, so it's the one monthly payment.
 */
export const earliestPaymentDate = (courses: { nextPaymentDate: Date | null }[]) =>
  courses
    .map((course) => course.nextPaymentDate)
    .filter((date): date is Date => date instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

/** The day a course leaves the student's plan by the scheduled drop or cancel; null if it stays. */
export const leavingDateOf = (courseId: string, change: MembershipChange | null) => {
  if (!change || (change.kind !== "drop" && change.kind !== "cancel")) return null;
  return change.courseIds.includes(courseId) ? change.effectiveDate : null;
};

/**
 * The courses still in the plan on the payment date `dueDate`: a course whose
 * drop or cancel starts on or before it isn't charged that payment. Without a
 * due date nothing is charged, so every course is returned.
 */
export const coursesContinuingOn = <T extends { courseId: string }>(
  courses: T[],
  change: MembershipChange | null,
  dueDate: Date | null,
) => {
  if (!dueDate) return courses;
  return courses.filter((course) => {
    const leavesOn = leavingDateOf(course.courseId, change);
    return !leavesOn || leavesOn.getTime() > dueDate.getTime();
  });
};

/** The last day the student still attends: the day before the change starts. */
export const lastDayBefore = (effectiveDate: Date) => addDays(effectiveDate, -1);

/**
 * Asked with fewer than 8 days left, the change starts on a later payment
 * date than the coming one: the student pays the coming month first.
 */
export const paysComingMonth = (paymentDate: Date | null, effectiveDate: Date | null) =>
  !!paymentDate && !!effectiveDate && effectiveDate.getTime() > paymentDate.getTime();
