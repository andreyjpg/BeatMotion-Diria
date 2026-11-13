import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { CLASS_LIST_COLUMNS, ClassListSchema, toClass } from "./classesSchema";

/**
 * Most rows the API returns in one response (max_rows in supabase/config.toml).
 * Asking for exactly that many lets the list tell when older classes were left out.
 */
export const CLASS_LIST_LIMIT = 1000;

/**
 * Admin "Clases" list: the classes that aren't deleted, hidden ones included
 * (only staff read those). Newest first, so past CLASS_LIST_LIMIT the oldest
 * classes are the ones left out; the screen puts them in its own order. The
 * course and visibility filters run on the phone: the tabs count all three,
 * and hiding a class (useSetClassHidden) moves it to its tab at once.
 */
export const useClasses = () => {
  return useQuery({
    queryKey: ["classes", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(CLASS_LIST_COLUMNS)
        .eq("is_deleted", false)
        .order("date", { ascending: false, nullsFirst: true })
        .order("start_time", { ascending: false, nullsFirst: true })
        .limit(CLASS_LIST_LIMIT);
      if (error) throw error;
      return ClassListSchema.parse(data.map(toClass));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};
