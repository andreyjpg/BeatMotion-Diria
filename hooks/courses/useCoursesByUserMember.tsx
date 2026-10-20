import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "react-native";
import { MEMBER_COLUMNS, toMember } from "../courseMember/schema";
import { COURSE_COLUMNS, courseSchemaWithMember, toCourse } from "./schema/courseSchema";

const MEMBERS_WITH_COURSE = `${MEMBER_COLUMNS}, course:courses!inner(${COURSE_COLUMNS})` as const;

/**
 * Courses the user is currently enrolled in, each merged with its membership
 * (payment status, next payment date). `id` is the membership id and
 * `courseId` the course id, as before.
 */
export const useCoursesByUserMember = (uid: string) => {
  const getMyCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("course_members")
        .select(MEMBERS_WITH_COURSE)
        .eq("user_id", uid)
        .eq("active", true);
      if (error) throw error;
      const courses = data.map(({ course, ...member }) => {
        const { id: _courseId, ...courseFields } = toCourse(course);
        return { ...toMember(member), ...courseFields, id: member.id };
      });
      return courseSchemaWithMember.parse(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      Alert.alert("Error", "No se pudieron cargar los cursos.");
      return [];
    }
  };

  return useQuery({
    queryKey: ["myCourses", uid],
    queryFn: getMyCourses,
    enabled: !!uid,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10,
  });
};
