import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "react-native";
import { COURSE_COLUMNS, courseSchema, toCourse } from "./schema/courseSchema";

const fetchCourses = async () => {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select(COURSE_COLUMNS)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return courseSchema.parse(data.map(toCourse));
  } catch (error) {
    console.error("Error fetching courses:", error);
    Alert.alert("Error fetching courses");
    throw error;
  }
};

// Course changes made in the app refresh this list through the mutations'
// invalidateQueries(["courses"]).
export const useCourses = () => {
  return useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
  });
};
