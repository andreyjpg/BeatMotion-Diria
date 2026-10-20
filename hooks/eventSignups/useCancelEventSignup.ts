import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { eventSignupsKeys } from "./schema";

type CancelEventSignupInput = {
  signupId: string;
  eventId: string;
};

/** The student cancels their own signup, which frees its spots. */
export const useCancelEventSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ signupId }: CancelEventSignupInput) => {
      const { error } = await supabase
        .from("event_signups")
        .update({ status: "canceled" })
        .eq("id", signupId);
      if (error) throw error;
    },
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventSignupsKeys.event(eventId) });
      Alert.alert("Registro cancelado", "Tu registro ha sido cancelado.");
    },
    onError: (error) => {
      console.error("Error cancelando inscripción de evento:", error);
      Alert.alert("Error", "No se pudo cancelar el registro. Intenta de nuevo.");
    },
  });
};
