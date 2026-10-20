import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type DashboardCounts = {
  activeStudents: number;
  activeTeachers: number;
  courses: number;
  classes: number;
  approvedEnrollments: number;
};

/** Admin home: headline counts. The database counts (no rows are downloaded). */
export const useDashboardCounts = () => {
  const fetchCounts = async (): Promise<DashboardCounts> => {
    const count = { count: "exact", head: true } as const;
    const [students, teachers, courses, classes, enrollments] = await Promise.all([
      supabase.from("profiles").select("id", count).eq("role", "user").eq("is_active", true),
      supabase.from("profiles").select("id", count).eq("role", "teacher").eq("is_active", true),
      supabase.from("courses").select("id", count).eq("is_deleted", false),
      supabase.from("classes").select("id", count).eq("is_deleted", false),
      supabase.from("enrollments").select("id", count).eq("status", "approved"),
    ]);
    for (const result of [students, teachers, courses, classes, enrollments]) {
      if (result.error) throw result.error;
    }
    return {
      activeStudents: students.count ?? 0,
      activeTeachers: teachers.count ?? 0,
      courses: courses.count ?? 0,
      classes: classes.count ?? 0,
      approvedEnrollments: enrollments.count ?? 0,
    };
  };

  return useQuery({
    queryKey: ["dashboardCounts"],
    queryFn: fetchCounts,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
};
