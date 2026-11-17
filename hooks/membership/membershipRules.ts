import { addDays } from "@/constants/helpers";
import type { MembershipChange } from "./schema";

// What a scheduled drop or cancel means for the student's courses and their
// monthly payment. The database decides the dates (membership_change_preview,
// membership_changes.effective_date); these only read them. Dates are local
// midnights (parseLocalDate), so they compare by calendar day.

/** The change waiting for its date, if any: the database allows one at a time. */
export const scheduledChangeOf = (changes: MembershipChange[] | undefined) =>
  changes?.find((change) => change.status === "scheduled") ?? null;

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
