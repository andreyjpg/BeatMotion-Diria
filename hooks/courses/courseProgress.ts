import { addDays, formatYYYYMMDD, weekdayIndex } from "@/constants/helpers";

// A course's progress through its calendar: for a student, from their own
// attendance (toCourseProgress); for its teacher and admins, from the classes
// where attendance was taken (toStaffCourseProgress). Dates are calendar days
// on the phone ("YYYY-MM-DD" keys compare as strings), which is Costa Rica
// time for the academy, like every date helper in constants/helpers.ts.

const DAYS_PER_WEEK = 7;

/** How one class date of the course shows in the progress bar. */
export type ProgressBlockState =
  | "attended"
  | "missed"
  | "noClass"
  | "beforeJoining"
  | "given"
  | "today"
  | "upcoming";

/** One class date of the course ("YYYY-MM-DD") and how it went. */
export type ProgressBlock = { date: string; state: ProgressBlockState };

/** How a past class went for the student (today's and later classes have none). */
export type ClassMark = "attended" | "missed" | "noClass" | "beforeJoining";

export type CoursePhase = "notStarted" | "inProgress" | "finished";

/** The course fields the progress reads. */
export type CourseSchedule = {
  /** Weekday as stored ("lunes"…"domingo"). */
  day?: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

/** What the progress knows about the student's attendance in the course. */
export type AttendanceFacts = {
  /** Classes where someone was marked present (course_classes_with_attendance): visible, dated, not deleted. */
  takenClasses: { classId: string; date: string }[];
  /** Classes where the student was marked present. */
  attendedClassIds: ReadonlySet<string>;
  /** When the student's membership started: earlier classes are never missed. */
  joinedAt: Date;
};

/** Where a course is in its calendar: the same for everyone, from its class dates and today only. */
export type CalendarProgress = {
  /** Whether the course has class dates (a weekday, a start and an end date), so a bar. */
  hasCalendar: boolean;
  phase: CoursePhase;
  /** N in "Clase X de N". */
  totalClasses: number;
  /** X: class dates up to today, today's included. */
  currentClass: number;
  isClassToday: boolean;
  /** Class dates after today. */
  remainingClasses: number;
  /** currentClass of totalClasses, 0-100. */
  progressPercent: number;
  firstClassDate: Date | null;
  lastClassDate: Date | null;
  /** First class date after today. */
  nextClassDate: Date | null;
};

export type CourseProgress = CalendarProgress & {
  /** One per class date, in order; empty without a calendar. */
  blocks: ProgressBlock[];
  /** Past days the student was marked present, make-up classes on other days included. */
  attended: number;
  /** Past days after joining where attendance was taken and the student wasn't marked present. */
  missed: number;
  /** Past class dates after joining without a class or without attendance taken. */
  noClass: number;
  /** Past class dates from before the student joined that they didn't attend. */
  beforeJoining: number;
  /** attended / (attended + missed), 0-100; null before the course starts or with no class given. */
  attendancePercent: number | null;
  /** The attendance if the student comes today and to every class left; null when none is left. */
  projectedPercent: number | null;
};

/** A course's progress for its teacher and admins. */
export type StaffCourseProgress = CalendarProgress & {
  /** One per class date, in order (given, no class, today or to come); empty without a calendar. */
  blocks: ProgressBlock[];
  /** Past class dates where someone was marked present in a class of that day. */
  given: number;
  /** Past class dates where nobody was marked present, or whose class is hidden. */
  noClass: number;
};

type DayMark = "attended" | "missed";

const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

const countState = (blocks: ProgressBlock[], state: ProgressBlockState) =>
  blocks.filter((block) => block.state === state).length;

/** The course's class dates: its weekday from its start date to its end date ([] when one is missing). */
export const courseClassDates = ({ day, startDate, endDate }: CourseSchedule) => {
  const weekday = weekdayIndex(day);
  if (weekday === null || !startDate || !endDate) return [];
  const daysToFirstClass = (weekday - startDate.getDay() + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const dates: Date[] = [];
  for (
    let date = addDays(startDate, daysToFirstClass);
    date.getTime() <= endDate.getTime();
    date = addDays(date, DAYS_PER_WEEK)
  ) {
    dates.push(date);
  }
  return dates;
};

/** Whether a course has class dates, so its progress has a bar. */
export const hasClassDates = (course: CourseSchedule) => courseClassDates(course).length > 0;

const phaseOf = (dateKeys: string[], { startDate, endDate }: CourseSchedule, todayKey: string): CoursePhase => {
  const first = dateKeys[0];
  const last = dateKeys[dateKeys.length - 1];
  if (first && last) {
    if (first > todayKey) return "notStarted";
    return last < todayKey ? "finished" : "inProgress";
  }
  // Without class dates, the course's own dates decide.
  if (startDate && formatYYYYMMDD(startDate) > todayKey) return "notStarted";
  if (endDate && formatYYYYMMDD(endDate) < todayKey) return "finished";
  return "inProgress";
};

/**
 * Where a course is in its calendar (its weekday between its start and end
 * dates): "Clase X de N" and X ÷ N, with today's class counted. Attendance
 * never changes it.
 */
export const toCalendarProgress = (course: CourseSchedule, today = new Date()): CalendarProgress => {
  const todayKey = formatYYYYMMDD(today);
  const classDates = courseClassDates(course);
  const dateKeys = classDates.map((date) => formatYYYYMMDD(date));
  const remainingClasses = dateKeys.filter((date) => date > todayKey).length;
  const currentClass = dateKeys.length - remainingClasses;
  return {
    hasCalendar: dateKeys.length > 0,
    phase: phaseOf(dateKeys, course, todayKey),
    totalClasses: dateKeys.length,
    currentClass,
    isClassToday: dateKeys.includes(todayKey),
    remainingClasses,
    progressPercent: percentOf(currentClass, dateKeys.length) ?? 0,
    firstClassDate: classDates[0] ?? null,
    lastClassDate: classDates[classDates.length - 1] ?? null,
    nextClassDate: classDates.find((date) => formatYYYYMMDD(date) > todayKey) ?? null,
  };
};

/** One block per class date: to come after today, today's, and `pastState` for the earlier ones. */
const toBlocks = (
  course: CourseSchedule,
  todayKey: string,
  pastState: (date: string) => ProgressBlockState,
): ProgressBlock[] =>
  courseClassDates(course).map((classDate) => {
    const date = formatYYYYMMDD(classDate);
    if (date > todayKey) return { date, state: "upcoming" };
    if (date === todayKey) return { date, state: "today" };
    return { date, state: pastState(date) };
  });

/**
 * Past days (before today) where attendance was taken. A day is attended when
 * the student was marked present in any of its classes, even before joining;
 * otherwise it's missed, but only from the day they joined.
 */
const pastDayMarks = ({ takenClasses, attendedClassIds }: AttendanceFacts, todayKey: string, joinedKey: string) => {
  const marks = new Map<string, DayMark>();
  for (const { classId, date } of takenClasses) {
    if (date >= todayKey) continue;
    if (attendedClassIds.has(classId)) marks.set(date, "attended");
    else if (date >= joinedKey && !marks.has(date)) marks.set(date, "missed");
  }
  return marks;
};

/**
 * A student's progress in a course: one block per class date of its calendar
 * (its weekday between its start and end dates), and their attendance over
 * the past days where attendance was taken. Today's class isn't attended or
 * missed yet: it counts from tomorrow.
 */
export const toCourseProgress = (course: CourseSchedule, facts: AttendanceFacts, today = new Date()): CourseProgress => {
  const calendar = toCalendarProgress(course, today);
  const todayKey = formatYYYYMMDD(today);
  const joinedKey = formatYYYYMMDD(facts.joinedAt);
  const marks = pastDayMarks(facts, todayKey, joinedKey);
  const blocks = toBlocks(
    course,
    todayKey,
    (date) => marks.get(date) ?? (date < joinedKey ? "beforeJoining" : "noClass"),
  );

  const { phase, isClassToday, remainingClasses } = calendar;
  const dayMarks = [...marks.values()];
  const attended = dayMarks.filter((mark) => mark === "attended").length;
  const missed = dayMarks.length - attended;
  const classesLeft = remainingClasses + (isClassToday ? 1 : 0);

  return {
    ...calendar,
    blocks,
    attended,
    missed,
    noClass: countState(blocks, "noClass"),
    beforeJoining: countState(blocks, "beforeJoining"),
    attendancePercent: phase === "notStarted" ? null : percentOf(attended, attended + missed),
    projectedPercent:
      phase === "inProgress" && classesLeft > 0
        ? percentOf(attended + classesLeft, attended + missed + classesLeft)
        : null,
  };
};

/**
 * A course's progress for its teacher and admins: its calendar
 * (toCalendarProgress) and one block per class date. Attendance only tells
 * whether a past date's class was given: someone was marked present in a
 * class that day. `takenClasses` (course_classes_with_attendance) leaves
 * hidden classes out, so their dates show as no class.
 */
export const toStaffCourseProgress = (
  course: CourseSchedule,
  takenClasses: { date: string }[],
  today = new Date(),
): StaffCourseProgress => {
  const todayKey = formatYYYYMMDD(today);
  const givenDates = new Set(takenClasses.map((taken) => taken.date));
  const blocks = toBlocks(course, todayKey, (date) => (givenDates.has(date) ? "given" : "noClass"));
  return {
    ...toCalendarProgress(course, today),
    blocks,
    given: countState(blocks, "given"),
    noClass: countState(blocks, "noClass"),
  };
};

/**
 * How each past class went for the student, by class id, with the blocks'
 * rules applied to that one class. Today's, later and undated classes aren't
 * in it.
 */
export const toClassMarks = (
  classes: { id: string; date: string | null }[],
  { takenClasses, attendedClassIds, joinedAt }: AttendanceFacts,
  today = new Date(),
) => {
  const todayKey = formatYYYYMMDD(today);
  const joinedKey = formatYYYYMMDD(joinedAt);
  const takenClassIds = new Set(takenClasses.map((taken) => taken.classId));
  const marks = new Map<string, ClassMark>();
  for (const { id, date } of classes) {
    if (!date || date >= todayKey) continue;
    if (attendedClassIds.has(id)) marks.set(id, "attended");
    else if (date < joinedKey) marks.set(id, "beforeJoining");
    else marks.set(id, takenClassIds.has(id) ? "missed" : "noClass");
  }
  return marks;
};
