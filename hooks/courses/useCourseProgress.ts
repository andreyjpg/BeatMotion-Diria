import { useAttendanceByUser } from "@/hooks/attendance/useAttendanceByUser";
import { useAttendanceTakenClasses } from "@/hooks/attendance/useAttendanceTakenClasses";
import { pauseRangesOf } from "@/hooks/membership/membershipRules";
import { useMembershipChanges } from "@/hooks/membership/useMembershipChanges";
import { type AttendanceFacts, type CourseSchedule, toCourseProgress } from "./courseProgress";

/** A course merged with the student's membership (useCoursesByUserMember, useCourseDetail). */
type MemberCourse = CourseSchedule & { courseId: string; joinedAt: Date };

/**
 * A student's progress in one of their courses (toCourseProgress), and the
 * attendance it comes from (`facts`, for the class list). Both are null until
 * the student's attendance, the classes with attendance taken and their
 * pauses (classes during one are "En pausa", not missed) have loaded.
 */
export const useCourseProgress = (userId: string, course: MemberCourse | null | undefined) => {
  const courseId = course?.courseId ?? "";
  const attendanceQuery = useAttendanceByUser(userId, courseId);
  const takenClassesQuery = useAttendanceTakenClasses(courseId);
  const changesQuery = useMembershipChanges(userId);

  const facts: AttendanceFacts | null =
    course && attendanceQuery.data && takenClassesQuery.data && changesQuery.data
      ? {
          takenClasses: takenClassesQuery.data,
          attendedClassIds: new Set(
            attendanceQuery.data.filter((row) => row.attended).map((row) => row.classId),
          ),
          joinedAt: course.joinedAt,
          pausedRanges: pauseRangesOf(changesQuery.data),
        }
      : null;

  const refetch = () => {
    attendanceQuery.refetch();
    takenClassesQuery.refetch();
    changesQuery.refetch();
  };

  return {
    progress: course && facts ? toCourseProgress(course, facts) : null,
    facts,
    isError: attendanceQuery.isError || takenClassesQuery.isError || changesQuery.isError,
    refetch,
  };
};
