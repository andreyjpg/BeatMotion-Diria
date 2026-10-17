import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import zod from "zod";

const studentSchema = zod.array(
  zod.object({
    id: zod.string(),
    name: zod.string(),
    lastName: zod.string(),
    email: zod.string(),
    phone: zod.string().nullable(),
  })
);

export type AvailableStudent = zod.infer<typeof studentSchema>[number];

/** Active students without a pending or approved enrollment in the course. */
export const useAvailableStudents = (courseId: string) => {
  const fetchAvailableStudents = async () => {
    const [students, enrolled] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, lastName:last_name, email, phone")
        .eq("role", "user")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("enrollment_courses")
        .select("enrollment:enrollments!inner(userId:user_id)")
        .eq("course_id", courseId)
        .neq("enrollment.status", "rejected"),
    ]);
    if (students.error) throw students.error;
    if (enrolled.error) throw enrolled.error;

    const enrolledIds = new Set(enrolled.data.map((row) => row.enrollment.userId));
    return studentSchema.parse(students.data.filter((s) => !enrolledIds.has(s.id)));
  };

  return useQuery({
    queryKey: ["availableStudents", courseId],
    queryFn: fetchAvailableStudents,
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
