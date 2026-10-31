import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { ATTENDANCE_WITH_CLASS_COLUMNS, AttendanceSchemaArray } from "./schema";

/**
 * Every attendance row (RSVPs and marks) of one course's (not deleted)
 * classes, for the teacher's course summary. The course comes from the class.
 */
export const useAttendanceByCourse = (courseId: string) => {
  const getAttendance = async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select(ATTENDANCE_WITH_CLASS_COLUMNS)
      .eq("class.course_id", courseId)
      .eq("class.is_deleted", false);
    if (error) throw error;
    return AttendanceSchemaArray.parse(data.map(({ class: _class, ...row }) => row));
  };

  return useQuery({
    queryKey: ["attendance", "byCourse", courseId],
    queryFn: getAttendance,
    enabled: !!courseId,
  });
};
