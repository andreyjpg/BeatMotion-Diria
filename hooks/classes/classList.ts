import { formatYYYYMMDD } from "@/constants/helpers";
import type { ClassListItem } from "./classesSchema";

// The admin "Clases" list: every course's classes, numbered as on each course's
// screen and grouped by when they are. Dates are "YYYY-MM-DD" and times "HH:MM",
// so they compare as strings.

/** The tabs of the list: every class, the ones students see, or the hidden ones. */
export type ClassVisibility = "all" | "visible" | "hidden";

/** A class of the list with its course's title and its number in the course. */
export type ClassListRow = ClassListItem & {
  courseTitle: string;
  /** Position in its course, in date order (1 is the first), as on the course screen. */
  number: number;
};

export type ClassListSection = {
  key: "today" | "upcoming" | "undated" | "past";
  title: string;
  data: ClassListRow[];
};

/** Earlier first, and no value last: the course screens' order (date, then start time). */
const compareAscNullsLast = (a: string | null, b: string | null) => {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
};

const byDateAndTime = (a: ClassListItem, b: ClassListItem) =>
  compareAscNullsLast(a.date, b.date) || compareAscNullsLast(a.startTime, b.startTime);

/**
 * The classes of `courses`, in date order, each with its course's title and
 * number. A class whose course isn't in `courses` (a deleted course) is left out.
 */
export const toClassListRows = (classes: ClassListItem[], courses: { id: string; title: string }[]) => {
  const courseTitles = new Map(courses.map((course) => [course.id, course.title]));
  const classesSoFar = new Map<string, number>();
  return [...classes].sort(byDateAndTime).flatMap((cls): ClassListRow[] => {
    const courseTitle = courseTitles.get(cls.courseId);
    if (courseTitle === undefined) return [];
    const number = (classesSoFar.get(cls.courseId) ?? 0) + 1;
    classesSoFar.set(cls.courseId, number);
    return [{ ...cls, courseTitle, number }];
  });
};

/** Whether a class belongs in a visibility tab. */
export const matchesVisibility = (row: ClassListRow, visibility: ClassVisibility) =>
  visibility === "all" || row.isHidden === (visibility === "hidden");

/** How many classes each visibility tab has. */
export const visibilityCounts = (rows: ClassListRow[]): Record<ClassVisibility, number> => {
  const hidden = rows.filter((row) => row.isHidden).length;
  return { all: rows.length, visible: rows.length - hidden, hidden };
};

/**
 * Rows in date order (toClassListRows) -> today's classes, the coming ones,
 * the ones without a date, and the past ones newest first: the list opens on
 * what's next, and the past, which only grows, goes last. Empty sections are left out.
 */
export const toClassSections = (rows: ClassListRow[], today = new Date()): ClassListSection[] => {
  const todayKey = formatYYYYMMDD(today);
  const sections: ClassListSection[] = [
    { key: "today", title: "Hoy", data: rows.filter((row) => row.date === todayKey) },
    { key: "upcoming", title: "Próximas", data: rows.filter((row) => row.date !== null && row.date > todayKey) },
    { key: "undated", title: "Sin fecha", data: rows.filter((row) => row.date === null) },
    { key: "past", title: "Pasadas", data: rows.filter((row) => row.date !== null && row.date < todayKey).reverse() },
  ];
  return sections.filter((section) => section.data.length > 0);
};
