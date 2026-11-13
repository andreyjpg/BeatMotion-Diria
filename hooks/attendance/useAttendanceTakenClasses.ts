import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { TAKEN_CLASS_COLUMNS, TakenClassSchemaArray } from "./schema";

/**
 * A course's classes where attendance was taken (someone was marked present),
 * by date. Students can't read other students' attendance, so the database
 * finds them (course_classes_with_attendance), returning only ids and dates.
 * Hidden, deleted and undated classes aren't included.
 */
export const useAttendanceTakenClasses = (courseId: string) => {
  const getTakenClasses = async () => {
    const { data, error } = await supabase
      .rpc("course_classes_with_attendance", { p_course_id: courseId })
      .select(TAKEN_CLASS_COLUMNS);
    if (error) throw error;
    return TakenClassSchemaArray.parse(data);
  };

  return useQuery({
    // Under "attendance": taking attendance (useUpsertAttendance) refreshes it.
    queryKey: ["attendance", "takenClasses", courseId],
    queryFn: getTakenClasses,
    enabled: !!courseId,
    refetchOnWindowFocus: false,
  });
};
