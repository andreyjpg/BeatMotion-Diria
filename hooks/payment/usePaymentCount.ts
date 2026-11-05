import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { ReviewStatus } from "../enrollment/schema";

/** How many payments are in a status (the database counts them). */
export const usePaymentCount = (status: ReviewStatus) => {
  const fetchCount = async () => {
    const { count, error } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (error) throw error;
    return count ?? 0;
  };

  return useQuery({
    queryKey: ["payments", "count", status],
    queryFn: fetchCount,
    staleTime: 1000 * 60,
  });
};
