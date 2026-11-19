import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { adminMembershipErrorMessage, MEMBERSHIP_AFFECTED_KEYS, membershipChangeResultSchema } from "./schema";

/**
 * Admin: undoes a student's scheduled change, whoever made it
 * (admin_withdraw_membership_change). The student and the other admins are told.
 */
export const useAdminWithdrawMembershipChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changeId: string) => {
      const { data, error } = await supabase.rpc("admin_withdraw_membership_change", { p_change_id: changeId });
      if (error) throw error;
      return membershipChangeResultSchema.parse(data);
    },
    onSettled: () => {
      for (const queryKey of MEMBERSHIP_AFFECTED_KEYS) queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: () => {
      Alert.alert("Cambio deshecho", "Sus cursos y sus pagos siguen como antes. El estudiante recibe un aviso.");
    },
    onError: (error) => {
      const message = adminMembershipErrorMessage(error);
      if (message) console.warn("Undoing a student's change refused:", error.message);
      else console.error("Error undoing a student's membership change:", error);
      Alert.alert("No se pudo deshacer el cambio", message ?? "Intenta de nuevo en un momento.");
    },
  });
};
