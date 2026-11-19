import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { DraftInput } from "./notificationSchemas";

/**
 * Admin sends a notification to an audience (send_broadcast, admins only).
 * Every active user in it gets the in-app notification, and a push if their
 * device registered a token (trigger push_new_notifications).
 */
export const useSendBroadcast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DraftInput) => {
      const { data, error } = await supabase.rpc("send_broadcast", {
        p_title: input.title.trim(),
        p_content: input.content.trim(),
        p_recipients: input.recipients,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (recipients) => {
      queryClient.invalidateQueries({ queryKey: ["notificationsHistory"] });
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
      Alert.alert(
        "Notificación enviada",
        `Enviada a ${recipients} usuario${recipients === 1 ? "" : "s"}.`,
      );
    },
    onError: (error) => {
      console.error("Error sending broadcast:", error);
      Alert.alert("Error", "Notificación no pudo ser enviada");
    },
  });
};
