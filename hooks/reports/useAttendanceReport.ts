import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { AttendanceReportSchema } from "./schema";

/** Admin: attendance totals and rate per course (attendance_report). */
export const useAttendanceReport = () => {
  const fetchAttendanceReport = async () => {
    const { data, error } = await supabase.rpc("attendance_report");
    if (error) throw error;
    return AttendanceReportSchema.parse(data);
  };

  return useQuery({
    queryKey: ["reports", "attendance"],
    queryFn: fetchAttendanceReport,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
