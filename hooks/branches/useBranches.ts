import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { BRANCH_COLUMNS, branchListSchema } from "./schema";

const fetchBranches = async () => {
  const { data, error } = await supabase
    .from("branches")
    .select(BRANCH_COLUMNS)
    .eq("is_deleted", false)
    .order("name");
  if (error) throw error;
  return branchListSchema.parse(data);
};

// Branch changes made in the app refresh this list through the mutations'
// invalidateQueries(["branches"]).
export const useBranches = () => {
  return useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};
