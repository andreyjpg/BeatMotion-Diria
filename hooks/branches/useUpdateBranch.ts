import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type UpdateBranchInput = {
  id: string;
  name?: string;
  location?: string;
};

export const useUpdateBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateBranchInput) => {
      const { error } = await supabase
        .from("branches")
        .update({
          ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
          ...(patch.location !== undefined ? { location: patch.location.trim() } : {}),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      Alert.alert("Éxito", "Sucursal actualizada correctamente.");
    },
    onError: (error) => {
      console.error("Error updating branch:", error);
      Alert.alert("Error", "No se pudo actualizar la sucursal.");
    },
  });
};
