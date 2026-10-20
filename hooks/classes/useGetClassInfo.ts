import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { CLASS_COLUMNS, ClassesSchema, toClass } from "./classesSchema";

/** A single class, or null if it doesn't exist. */
export const useGetClassInfo = (classId: string) => {
  const getClassInfo = async () => {
    const { data, error } = await supabase.from("classes").select(CLASS_COLUMNS).eq("id", classId).maybeSingle();
    if (error) {
      console.error("Error in useGetClassInfo", error.message);
      throw error;
    }
    return data ? ClassesSchema.parse(toClass(data)) : null;
  };

  return useQuery({
    queryKey: ["classInfo", classId],
    queryFn: getClassInfo,
    enabled: !!classId,
  });
};
