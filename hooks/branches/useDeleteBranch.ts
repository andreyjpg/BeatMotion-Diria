import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

// Soft delete: courses keep their reference to the branch.
export const useDeleteBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      Alert.alert("Éxito", "Sucursal eliminada correctamente.");
    },
    onError: (error) => {
      console.error("Error deleting branch:", error);
      Alert.alert("Error", "No se pudo eliminar la sucursal.");
    },
  });
};
