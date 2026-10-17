import { isAnnualFeeExemptMonth } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

/**
 * Whether the student still owes this year's annual fee: not in November or
 * December, and no pending/approved payment or enrollment already includes it.
 */
export const useAnnualFeeDue = (userId?: string) => {
  const year = new Date().getFullYear();

  const fetchAnnualFeeDue = async () => {
    if (isAnnualFeeExemptMonth()) return false;

    const [payments, enrollments] = await Promise.all([
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("annual_fee_year", year)
        .neq("status", "rejected"),
      supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("annual_fee_year", year)
        .neq("status", "rejected"),
    ]);
    if (payments.error) throw payments.error;
    if (enrollments.error) throw enrollments.error;
    return (payments.count ?? 0) + (enrollments.count ?? 0) === 0;
  };

  return useQuery({
    queryKey: ["annualFeeDue", userId, year],
    queryFn: fetchAnnualFeeDue,
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  });
};
