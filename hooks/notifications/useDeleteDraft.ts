import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

export const useDeleteDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase.from("notification_drafts").delete().eq("id", draftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      Alert.alert("Éxito", "Borrador eliminado");
    },
    onError: (error) => {
      console.error("Error deleting draft:", error);
      Alert.alert("Error", "No se pudo eliminar el borrador");
    },
  });
};
