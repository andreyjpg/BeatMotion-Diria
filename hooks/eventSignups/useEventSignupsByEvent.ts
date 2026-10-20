import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { signReceiptUrls } from "../storage/receiptStorage";
import {
  EVENT_SIGNUP_COLUMNS,
  eventSignupCollectionSchema,
  eventSignupsKeys,
  toEventSignup,
} from "./schema";

/** Admin: every signup of an event, newest first, with receipt URLs. */
export const useEventSignupsByEvent = (eventId?: string) => {
  const fetchSignups = async () => {
    const { data, error } = await supabase
      .from("event_signups")
      .select(EVENT_SIGNUP_COLUMNS)
      .eq("event_id", eventId!)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const urls = await signReceiptUrls(data.map((row) => row.receiptPath));
    return eventSignupCollectionSchema.parse(data.map((row) => toEventSignup(row, urls)));
  };

  return useQuery({
    queryKey: eventSignupsKeys.byEvent(eventId ?? ""),
    queryFn: fetchSignups,
    enabled: !!eventId,
    staleTime: 1000 * 60 * 10, // under the signed URLs' hour
    refetchOnWindowFocus: false,
  });
};
