import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { EVENT_COLUMNS, eventCollectionSchema, toEvent } from "./schema";

type Options = {
  /** Admins also see drafts (students only ever get published events). */
  includeDrafts?: boolean;
  /** Include members-only events, not just public ones. */
  includePrivate?: boolean;
};

/** Events that aren't deleted, soonest first. */
export const useEvents = (options?: Options) => {
  const includeDrafts = !!options?.includeDrafts;
  const includePrivate = !!options?.includePrivate;

  const fetchEvents = async () => {
    let query = supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("is_deleted", false)
      .order("starts_at", { ascending: true });
    if (!includeDrafts) query = query.eq("status", "published");
    if (!includePrivate) query = query.eq("is_public", true);

    const { data, error } = await query;
    if (error) throw error;
    return eventCollectionSchema.parse(data.map(toEvent));
  };

  return useQuery({
    queryKey: ["events", "list", includeDrafts, includePrivate],
    queryFn: fetchEvents,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};
