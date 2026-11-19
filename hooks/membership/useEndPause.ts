import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { MEMBERSHIP_AFFECTED_KEYS, membershipChangeResultSchema, membershipErrorMessage } from "./schema";

/**
 * "Volver antes": the student ends their pause today (end_pause). Their
 * courses are back, the month is due today and the admins are told.
 */
export const useEndPause = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("end_pause");
      if (error) throw error;
      return membershipChangeResultSchema.parse(data);
    },
    onSettled: () => {
      for (const queryKey of MEMBERSHIP_AFFECTED_KEYS) queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: () => {
      Alert.alert("Pausa terminada", "Tus cursos vuelven hoy. Revisa tu mensualidad en Pagos.");
    },
    onError: (error) => {
      const message = membershipErrorMessage(error);
      if (message) console.warn("Ending the pause refused:", error.message);
      else console.error("Error ending a pause:", error);
      Alert.alert("No se pudo terminar la pausa", message ?? "Intenta de nuevo en un momento.");
    },
  });
};
