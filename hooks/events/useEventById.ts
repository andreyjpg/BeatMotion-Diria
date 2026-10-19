import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { EVENT_COLUMNS, eventSchema, toEvent } from "./schema";

/** One event, or null if it doesn't exist (or the user can't see it). */
export const useEventById = (id?: string) => {
  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("id", id!)
      .maybeSingle();
    if (error) throw error;
    return data ? eventSchema.parse(toEvent(data)) : null;
  };

  return useQuery({
    queryKey: ["events", "byId", id],
    queryFn: fetchEvent,
    enabled: !!id,
  });
};
