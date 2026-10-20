import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { CLASS_COLUMNS, ClassesSchemaArray, toClass } from "./classesSchema";

/** Every non-deleted class, in date order (for screens that group them by course). */
export const useActiveClasses = () => {
  return useQuery({
    queryKey: ["classes", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(CLASS_COLUMNS)
        .eq("is_deleted", false)
        .order("date", { ascending: true, nullsFirst: false })
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return ClassesSchemaArray.parse(data.map(toClass));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};
