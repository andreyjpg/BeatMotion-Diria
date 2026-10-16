import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { CLASS_COLUMNS, toClass } from "./classesSchema";

const CLASSES_WITH_TEACHER =
  `${CLASS_COLUMNS}, course:courses!inner(teacher:profiles!courses_teacher_id_fkey(name, lastName:last_name))` as const;

/**
 * A course's classes with the teacher's name (for assigning a student to a
 * class). The teacher belongs to the course, so every class shows the same one.
 */
export const useClassesByCourse = (courseId: string) => {
  return useQuery({
    // Different shape from useClassesByCourseId, so a different cache key.
    queryKey: ["classes", courseId, "withTeacher"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(CLASSES_WITH_TEACHER)
        .eq("course_id", courseId)
        .eq("is_deleted", false)
        .order("date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data.map(({ course, ...row }) => ({
        ...toClass(row),
        teacherName: course.teacher ? `${course.teacher.name} ${course.teacher.lastName}`.trim() : "Sin asignar",
      }));
    },
    enabled: !!courseId,
  });
};
