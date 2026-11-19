import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "react-native";
import { MEMBER_COLUMNS, toMember } from "../courseMember/schema";
import { COURSE_COLUMNS, courseWithMemberElement, toCourse } from "./schema/courseSchema";

const MEMBER_WITH_COURSE = `${MEMBER_COLUMNS}, course:courses!inner(${COURSE_COLUMNS})` as const;

/** A course the user belongs to, merged with that membership; null if they don't. */
export const useCourseDetail = (uid: string, courseId: string) => {
  const getMyCourseDetail = async () => {
    try {
      const { data, error } = await supabase
        .from("course_members")
        .select(MEMBER_WITH_COURSE)
        .eq("user_id", uid)
        .eq("course_id", courseId)
        .order("active", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { course, ...member } = data;
      const { id: _courseId, ...courseFields } = toCourse(course);
      return courseWithMemberElement.parse({ ...toMember(member), ...courseFields, id: member.id });
    } catch (error) {
      console.error("Error fetching courses:", error);
      Alert.alert("Error", "No se pudieron cargar los cursos.");
      return null;
    }
  };

  return useQuery({
    queryKey: ["courseDetail", uid, courseId],
    queryFn: getMyCourseDetail,
    enabled: !!uid && !!courseId,
    refetchOnWindowFocus: false,
  });
};
