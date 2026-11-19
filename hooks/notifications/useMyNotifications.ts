import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { NOTIFICATION_COLUMNS, notificationsList } from "./notificationSchemas";

/** Reminders and announcements accumulate; the list shows the latest ones. */
const LIMIT = 100;

/** The signed-in user's notifications, newest first. */
export const useMyNotifications = () => {
  const { user } = useActiveUser();
  const userId = user?.uid ?? "";

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (error) throw error;
    return notificationsList.parse(data);
  };

  return useQuery({
    queryKey: ["myNotifications", userId],
    queryFn: fetchNotifications,
    enabled: !!userId,
  });
};
