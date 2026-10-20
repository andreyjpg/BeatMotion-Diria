import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { EnrollmentReportSchema } from "./schema";

/** Admin: enrollment request totals, per course and per month (enrollment_report). */
export const useEnrollmentReport = () => {
  const fetchEnrollmentReport = async () => {
    const { data, error } = await supabase.rpc("enrollment_report");
    if (error) throw error;
    return EnrollmentReportSchema.parse(data);
  };

  return useQuery({
    queryKey: ["reports", "enrollments"],
    queryFn: fetchEnrollmentReport,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
