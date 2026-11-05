import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { eventSignupsKeys, myActiveSignupRowsSchema } from "./schema";
import { ACTIVE_SIGNUP_STATUSES } from "./utils";

/** The events the signed-in student is signed up for (the events list marks them). */
export const useMyActiveSignupEventIds = () => {
  const { user } = useActiveUser();
  const userId = user?.uid ?? "";

  const fetchEventIds = async () => {
    const { data, error } = await supabase
      .from("event_signups")
      .select("eventId:event_id")
      .eq("user_id", userId)
      .in("status", [...ACTIVE_SIGNUP_STATUSES]);
    if (error) throw error;
    return new Set(myActiveSignupRowsSchema.parse(data).map((row) => row.eventId));
  };

  return useQuery({
    queryKey: eventSignupsKeys.myActive(userId),
    queryFn: fetchEventIds,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};
