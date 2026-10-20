import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { ATTENDANCE_WITH_CLASS_COLUMNS, AttendanceSchemaArray } from "./schema";

/**
 * A student's attendance rows for one course's (not deleted) classes.
 * attendance has no course_id: the course comes from the class.
 */
export const useAttendanceByUser = (userId: string, courseId: string) => {
  const getAttendance = async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select(ATTENDANCE_WITH_CLASS_COLUMNS)
      .eq("user_id", userId)
      .eq("class.course_id", courseId)
      .eq("class.is_deleted", false);
    if (error) throw error;
    return AttendanceSchemaArray.parse(data.map(({ class: _class, ...row }) => row));
  };

  return useQuery({
    // The course is part of the key: each course page has its own rows.
    queryKey: ["attendance", "byUser", userId, courseId],
    queryFn: getAttendance,
    enabled: !!userId && !!courseId,
  });
};
