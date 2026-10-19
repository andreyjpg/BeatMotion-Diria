import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { DRAFT_COLUMNS, draftListSchema } from "./notificationSchemas";

/** Admin: saved notification drafts, most recently edited first. */
export const useDrafts = () => {
  const fetchDrafts = async () => {
    const { data, error } = await supabase
      .from("notification_drafts")
      .select(DRAFT_COLUMNS)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return draftListSchema.parse(data);
  };

  return useQuery({
    queryKey: ["drafts", "list"],
    queryFn: fetchDrafts,
  });
};
