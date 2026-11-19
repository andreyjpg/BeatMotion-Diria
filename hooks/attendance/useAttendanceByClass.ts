import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { ATTENDANCE_COLUMNS, AttendanceSchemaArray } from "./schema";

/** Every attendance row (RSVPs and marks) of one class, for the attendance sheet. */
export const useAttendanceByClass = (classId: string) => {
  const getAttendance = async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select(ATTENDANCE_COLUMNS)
      .eq("class_id", classId);
    if (error) throw error;
    return AttendanceSchemaArray.parse(data);
  };

  return useQuery({
    queryKey: ["attendance", "byClass", classId],
    queryFn: getAttendance,
    enabled: !!classId,
  });
};
