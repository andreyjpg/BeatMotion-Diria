import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { MEMBERSHIP_AFFECTED_KEYS, membershipChangeResultSchema, membershipErrorMessage } from "./schema";

/**
 * The student undoes their scheduled change, until the day before it starts
 * (withdraw_membership_change). Payments and reminders work as before, and
 * the admins are told.
 */
export const useWithdrawMembershipChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changeId: string) => {
      const { data, error } = await supabase.rpc("withdraw_membership_change", { p_change_id: changeId });
      if (error) throw error;
      return membershipChangeResultSchema.parse(data);
    },
    onSettled: () => {
      for (const queryKey of MEMBERSHIP_AFFECTED_KEYS) queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: () => {
      Alert.alert("Cambio deshecho", "Tus cursos y tus pagos siguen como antes.");
    },
    onError: (error) => {
      const message = membershipErrorMessage(error);
      if (message) console.warn("Undoing the membership change refused:", error.message);
      else console.error("Error undoing a membership change:", error);
      Alert.alert("No se pudo deshacer el cambio", message ?? "Intenta de nuevo en un momento.");
    },
  });
};
