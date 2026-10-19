import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

/** Marks one of the user's notifications as read (`read` is the only column they can change). */
export const useMarkNotificationAsSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
    },
    onError: (error) => {
      console.error("Error en useMarkNotificationAsSeen", error);
      Alert.alert("Error", "Error al marcar la notificación como vista");
    },
  });
};
