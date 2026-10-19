import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type SetSurveyActiveInput = { surveyId: string; isActive: boolean };

/** Admin opens or closes a survey for answers. */
export const useSetSurveyActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ surveyId, isActive }: SetSurveyActiveInput) => {
      const { error } = await supabase
        .from("surveys")
        .update({ is_active: isActive })
        .eq("id", surveyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (error) => {
      console.error("Error updating survey:", error);
      Alert.alert("Error", "No se pudo actualizar la encuesta.");
    },
  });
};
