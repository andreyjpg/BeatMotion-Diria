import { summarizeAgeCounts } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { AgeReportSchema } from "./schema";

/** Admin: the active students per age group and their average age (age_report). */
export const useAgeReport = () => {
  const fetchAgeReport = async () => {
    const { data, error } = await supabase.rpc("age_report");
    if (error) throw error;
    return summarizeAgeCounts(AgeReportSchema.parse(data));
  };

  return useQuery({
    queryKey: ["reports", "ages"],
    queryFn: fetchAgeReport,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
