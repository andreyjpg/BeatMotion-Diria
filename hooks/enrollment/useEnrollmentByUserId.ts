import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { ENROLLMENT_COLUMNS, enrollmentSchema, toEnrollment } from "./schema";

/** The student's live enrollment requests (pending or approved) with their course ids. */
export const useEnrollmentByUserId = (userId?: string) => {
  const fetchEnrollments = async () => {
    const { data, error } = await supabase
      .from("enrollments")
      .select(ENROLLMENT_COLUMNS)
      .eq("user_id", userId!)
      .in("status", ["pending", "approved"]);
    if (error) throw error;
    return enrollmentSchema.parse(data.map(toEnrollment));
  };

  return useQuery({
    queryKey: ["enrollments", "byUser", userId],
    queryFn: fetchEnrollments,
    enabled: !!userId,
    staleTime: 1000 * 60 * 20, // 20 minutes
    refetchOnWindowFocus: false,
  });
};
