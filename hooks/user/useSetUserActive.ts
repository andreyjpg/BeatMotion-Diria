import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type SetUserActiveInput = { userId: string; isActive: boolean };

/** Admin activates or deactivates an account (only admins can change is_active). */
export const useSetUserActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: SetUserActiveInput) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardCounts"] });
      Alert.alert("Éxito", `Usuario ${isActive ? "activado" : "desactivado"}`);
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      Alert.alert("Error", "No se pudo actualizar el usuario.");
    },
  });
};
