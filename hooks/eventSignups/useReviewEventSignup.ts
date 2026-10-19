import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { eventSignupsKeys } from "./schema";

type ReviewEventSignupInput = {
  signupId: string;
  eventId: string;
  status: "approved" | "rejected";
};

/** Admin approves or rejects a signup (rejecting frees its spots). */
export const useReviewEventSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ signupId, status }: ReviewEventSignupInput) => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("event_signups")
        .update({
          status,
          reviewed_by: session.session?.user.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", signupId);
      if (error) throw error;
    },
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventSignupsKeys.event(eventId) });
    },
    onError: (error) => {
      console.error("Error actualizando inscripción de evento:", error);
      Alert.alert("Error", "No se pudo actualizar la inscripción.");
    },
  });
};
