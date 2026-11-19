import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { eventSignupCountRowsSchema, eventSignupsKeys } from "./schema";
import { ACTIVE_SIGNUP_STATUSES } from "./utils";

export type EventSignupCounts = {
  /** People coming, guests included (same as what fills the event's capacity). */
  people: number;
  /** Signups waiting for the admin to review their receipt. */
  pending: number;
};

/** Admin events list: totals per event, from one query for the whole list. */
export const useEventSignupCounts = (eventIds: string[]) => {
  const fetchCounts = async () => {
    const { data, error } = await supabase
      .from("event_signups")
      .select("eventId:event_id, status, totalAttendees:total_attendees")
      .in("event_id", eventIds)
      .in("status", [...ACTIVE_SIGNUP_STATUSES]);
    if (error) throw error;

    const counts: Record<string, EventSignupCounts> = {};
    for (const signup of eventSignupCountRowsSchema.parse(data)) {
      const event = (counts[signup.eventId] ??= { people: 0, pending: 0 });
      event.people += signup.totalAttendees;
      if (signup.status === "pending") event.pending += 1;
    }
    return counts;
  };

  return useQuery({
    queryKey: eventSignupsKeys.counts(eventIds),
    queryFn: fetchCounts,
    enabled: eventIds.length > 0,
    staleTime: 1000 * 60,
  });
};
