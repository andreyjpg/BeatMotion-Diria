import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { BRANCH_COLUMNS, branchSchema } from "./schema";

const fetchBranchById = async (id: string) => {
  const { data, error } = await supabase.from("branches").select(BRANCH_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Sucursal no encontrada");
  return branchSchema.parse(data);
};

export const useBranchById = (id: string) => {
  return useQuery({
    queryKey: ["branches", id],
    queryFn: () => fetchBranchById(id),
    enabled: !!id,
  });
};
