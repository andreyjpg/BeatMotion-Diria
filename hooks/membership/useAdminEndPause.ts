import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { adminMembershipErrorMessage, MEMBERSHIP_AFFECTED_KEYS, membershipChangeResultSchema } from "./schema";

/**
 * Admin: ends a student's pause today (admin_end_pause). Their courses are
 * back, the month is due today, and the student and the other admins are told.
 */
export const useAdminEndPause = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc("admin_end_pause", { p_user_id: userId });
      if (error) throw error;
      return membershipChangeResultSchema.parse(data);
    },
    onSettled: () => {
      for (const queryKey of MEMBERSHIP_AFFECTED_KEYS) queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: () => {
      Alert.alert("Pausa terminada", "Sus cursos vuelven hoy. El estudiante recibe un aviso.");
    },
    onError: (error) => {
      const message = adminMembershipErrorMessage(error);
      if (message) console.warn("Ending a student's pause refused:", error.message);
      else console.error("Error ending a student's pause:", error);
      Alert.alert("No se pudo terminar la pausa", message ?? "Intenta de nuevo en un momento.");
    },
  });
};
