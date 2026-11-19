import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

/** Soft delete: the survey disappears from the app, its responses stay. */
export const useDeleteSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (surveyId: string) => {
      const { error } = await supabase
        .from("surveys")
        .update({ is_deleted: true })
        .eq("id", surveyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      Alert.alert("Éxito", "Encuesta eliminada correctamente.");
    },
    onError: (error) => {
      console.error("Error deleting survey:", error);
      Alert.alert("Error", "No se pudo eliminar la encuesta.");
    },
  });
};
