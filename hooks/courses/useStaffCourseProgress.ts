import { useAttendanceTakenClasses } from "@/hooks/attendance/useAttendanceTakenClasses";
import { type CourseSchedule, hasClassDates, toStaffCourseProgress } from "./courseProgress";

/** The course fields the staff progress reads (useCourseById). */
type StaffCourse = CourseSchedule & { id: string };

/**
 * A course's progress for its teacher and admins (toStaffCourseProgress).
 * `hasCalendar` comes from the course alone; `progress` is null until the
 * classes with attendance taken have loaded. A course without class dates
 * has no progress and makes no query.
 */
export const useStaffCourseProgress = (course: StaffCourse | null | undefined) => {
  const hasCalendar = !!course && hasClassDates(course);
  const takenClassesQuery = useAttendanceTakenClasses(hasCalendar ? course.id : "");

  const refetch = () => {
    // refetch() runs even on a disabled query, which would ask for course "".
    if (hasCalendar) takenClassesQuery.refetch();
  };

  return {
    hasCalendar,
    progress:
      hasCalendar && takenClassesQuery.data ? toStaffCourseProgress(course, takenClassesQuery.data) : null,
    isError: takenClassesQuery.isError,
    refetch,
  };
};
