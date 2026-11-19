import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { ReviewStatus } from "./schema";

/** How many enrollment requests are in a status (the database counts them). */
export const useEnrollmentCount = (status: ReviewStatus) => {
  const fetchCount = async () => {
    const { count, error } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (error) throw error;
    return count ?? 0;
  };

  return useQuery({
    queryKey: ["enrollments", "count", status],
    queryFn: fetchCount,
    staleTime: 1000 * 60,
  });
};
