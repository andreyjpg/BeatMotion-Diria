import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { DRAFT_COLUMNS, draftSchema } from "./notificationSchemas";

/** One draft, or null if it doesn't exist. */
export const useDraftById = (draftId?: string) => {
  const fetchDraft = async () => {
    const { data, error } = await supabase
      .from("notification_drafts")
      .select(DRAFT_COLUMNS)
      .eq("id", draftId!)
      .maybeSingle();
    if (error) throw error;
    return data ? draftSchema.parse(data) : null;
  };

  return useQuery({
    // The id is part of the key (it wasn't: every draft shared one cache entry).
    queryKey: ["drafts", "byId", draftId],
    queryFn: fetchDraft,
    enabled: !!draftId,
  });
};
