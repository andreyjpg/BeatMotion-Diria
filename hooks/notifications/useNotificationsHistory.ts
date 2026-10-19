import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { BROADCAST_COLUMNS, broadcastListSchema } from "./notificationSchemas";

/** Admin: notifications already sent, newest first. */
export const useNotificationsHistory = () => {
  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("notification_broadcasts")
      .select(BROADCAST_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return broadcastListSchema.parse(data);
  };

  return useQuery({
    queryKey: ["notificationsHistory"],
    queryFn: fetchHistory,
  });
};
