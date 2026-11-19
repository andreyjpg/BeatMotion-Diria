import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { COURSE_COLUMNS, courseSchema, toCourse } from "./schema/courseSchema";

// Courses students can enroll in: active and assigned to a branch.
const fetchCoursesAvailable = async () => {
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_COLUMNS)
    .eq("is_deleted", false)
    .not("branch_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return courseSchema.parse(data.map(toCourse));
};

export const useCoursesAvailable = () => {
  return useQuery({
    queryKey: ["courses", "available"],
    queryFn: fetchCoursesAvailable,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
};
