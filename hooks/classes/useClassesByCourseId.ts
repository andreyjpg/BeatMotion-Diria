import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { CLASS_COLUMNS, ClassesSchemaArray, toClass } from "./classesSchema";

/** A course's classes in date order (deleted classes excluded). */
export const useClassesByCourseId = (courseId: string) => {
  const getClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select(CLASS_COLUMNS)
        .eq("course_id", courseId)
        .eq("is_deleted", false)
        .order("date", { ascending: true, nullsFirst: false })
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return ClassesSchemaArray.parse(data.map(toClass));
    } catch (error) {
      console.error("Error fetching classes:", error);
      throw error;
    }
  };

  return useQuery({
    queryKey: ["classes", courseId],
    queryFn: getClasses,
    enabled: !!courseId,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10,
  });
};
