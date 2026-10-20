import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { signReceiptUrls } from "../storage/receiptStorage";
import { EVENT_SIGNUP_COLUMNS, eventSignupSchema, eventSignupsKeys, toEventSignup } from "./schema";

/** The signed-in student's latest signup for an event, or null. */
export const useMyEventSignup = (eventId?: string) => {
  const { user } = useActiveUser();
  const userId = user?.uid ?? "";

  const fetchSignup = async () => {
    const { data, error } = await supabase
      .from("event_signups")
      .select(EVENT_SIGNUP_COLUMNS)
      .eq("event_id", eventId!)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const urls = await signReceiptUrls([data.receiptPath]);
    return eventSignupSchema.parse(toEventSignup(data, urls));
  };

  return useQuery({
    queryKey: eventSignupsKeys.mine(eventId ?? "", userId),
    queryFn: fetchSignup,
    enabled: !!eventId && !!userId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
