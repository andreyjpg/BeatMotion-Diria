import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { COURSE_COLUMNS, courseSchema, toCourse } from "./schema/courseSchema";

/** A single course (including soft-deleted ones), or null if it doesn't exist. */
const fetchCourseById = async (id: string) => {
  const { data, error } = await supabase.from("courses").select(COURSE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? courseSchema.element.parse(toCourse(data)) : null;
};

export const useCourseById = (id: string | undefined) => {
  return useQuery({
    queryKey: ["courses", "byId", id],
    queryFn: () => fetchCourseById(id!),
    enabled: !!id,
  });
};
