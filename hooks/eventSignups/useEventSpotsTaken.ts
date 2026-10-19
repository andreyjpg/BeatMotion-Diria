import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { eventSignupsKeys } from "./schema";

/**
 * People (students + guests) holding a spot in an event. Students can't read
 * each other's signups, so the database counts them (event_spots_taken).
 */
export const useEventSpotsTaken = (eventId?: string) => {
  const fetchSpotsTaken = async () => {
    const { data, error } = await supabase.rpc("event_spots_taken", { p_event_id: eventId! });
    if (error) throw error;
    return data;
  };

  return useQuery({
    queryKey: eventSignupsKeys.spotsTaken(eventId ?? ""),
    queryFn: fetchSpotsTaken,
    enabled: !!eventId,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });
};
