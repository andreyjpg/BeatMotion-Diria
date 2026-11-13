import { addDays, formatYYYYMMDD, weekdayIndex } from "@/constants/helpers";

// A student's progress in a course, from the course's calendar and the classes
// where attendance was taken. Dates are calendar days on the phone ("YYYY-MM-DD"
// keys compare as strings), which is Costa Rica time for the academy, like
// every date helper in constants/helpers.ts.

const DAYS_PER_WEEK = 7;

/** How one class date of the course shows in the progress bar. */
export type ProgressBlockState = "attended" | "missed" | "noClass" | "beforeJoining" | "today" | "upcoming";

/** One class date of the course ("YYYY-MM-DD") and how it went for the student. */
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

export type CourseProgress = {
  /** Whether the course has class dates (a weekday, a start and an end date), so a bar. */
  hasCalendar: boolean;
  phase: CoursePhase;
  /** One per class date, in order; empty without a calendar. */
  blocks: ProgressBlock[];
  /** N in "Clase X de N". */
  totalClasses: number;
  /** X: class dates up to today, today's included. */
  currentClass: number;
  isClassToday: boolean;
  /** Class dates after today. */
  remainingClasses: number;
  /** currentClass of totalClasses, 0-100. */
  progressPercent: number;
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
  firstClassDate: Date | null;
  lastClassDate: Date | null;
  /** First class date after today. */
  nextClassDate: Date | null;
};

type DayMark = "attended" | "missed";

const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

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

const blockState = (
  date: string,
  todayKey: string,
  joinedKey: string,
  marks: Map<string, DayMark>,
): ProgressBlockState => {
  if (date > todayKey) return "upcoming";
  if (date === todayKey) return "today";
  const mark = marks.get(date);
  if (mark) return mark;
  return date < joinedKey ? "beforeJoining" : "noClass";
};

const phaseOf = (blocks: ProgressBlock[], { startDate, endDate }: CourseSchedule, todayKey: string): CoursePhase => {
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  if (first && last) {
    if (first.date > todayKey) return "notStarted";
    return last.date < todayKey ? "finished" : "inProgress";
  }
  // Without class dates, the course's own dates decide.
  if (startDate && formatYYYYMMDD(startDate) > todayKey) return "notStarted";
  if (endDate && formatYYYYMMDD(endDate) < todayKey) return "finished";
  return "inProgress";
};

/**
 * A student's progress in a course: one block per class date of its calendar
 * (its weekday between its start and end dates), and their attendance over
 * the past days where attendance was taken. Today's class isn't attended or
 * missed yet: it counts from tomorrow.
 */
export const toCourseProgress = (course: CourseSchedule, facts: AttendanceFacts, today = new Date()): CourseProgress => {
  const todayKey = formatYYYYMMDD(today);
  const joinedKey = formatYYYYMMDD(facts.joinedAt);
  const marks = pastDayMarks(facts, todayKey, joinedKey);
  const classDates = courseClassDates(course);
  const blocks: ProgressBlock[] = classDates.map((date) => {
    const key = formatYYYYMMDD(date);
    return { date: key, state: blockState(key, todayKey, joinedKey, marks) };
  });
  const countBlocks = (state: ProgressBlockState) => blocks.filter((block) => block.state === state).length;

  const remainingClasses = countBlocks("upcoming");
  const isClassToday = countBlocks("today") > 0;
  const currentClass = blocks.length - remainingClasses;
  const dayMarks = [...marks.values()];
  const attended = dayMarks.filter((mark) => mark === "attended").length;
  const missed = dayMarks.length - attended;
  const phase = phaseOf(blocks, course, todayKey);
  const classesLeft = remainingClasses + (isClassToday ? 1 : 0);

  return {
    hasCalendar: blocks.length > 0,
    phase,
    blocks,
    totalClasses: blocks.length,
    currentClass,
    isClassToday,
    remainingClasses,
    progressPercent: percentOf(currentClass, blocks.length) ?? 0,
    attended,
    missed,
    noClass: countBlocks("noClass"),
    beforeJoining: countBlocks("beforeJoining"),
    attendancePercent: phase === "notStarted" ? null : percentOf(attended, attended + missed),
    projectedPercent:
      phase === "inProgress" && classesLeft > 0
        ? percentOf(attended + classesLeft, attended + missed + classesLeft)
        : null,
    firstClassDate: classDates[0] ?? null,
    lastClassDate: classDates[classDates.length - 1] ?? null,
    nextClassDate: classDates.find((date) => formatYYYYMMDD(date) > todayKey) ?? null,
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
