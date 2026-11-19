import { supabase } from "@/lib/supabase";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useQuery } from "@tanstack/react-query";
import { ATTENDANCE_COLUMNS, AttendanceSchema } from "./schema";

/** The signed-in student's row for one class (their RSVP), or null if they haven't answered. */
export const useMyAttendance = (classId: string) => {
  const { user } = useActiveUser();
  const userId = user?.uid ?? "";

  const getAttendance = async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select(ATTENDANCE_COLUMNS)
      .eq("class_id", classId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? AttendanceSchema.parse(data) : null;
  };

  return useQuery({
    queryKey: ["attendance", "mine", classId, userId],
    queryFn: getAttendance,
    enabled: !!classId && !!userId,
  });
};
