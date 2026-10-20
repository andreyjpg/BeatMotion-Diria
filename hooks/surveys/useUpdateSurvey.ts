import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { SurveyInput, toSaveSurveyArgs } from "./surveySchema";

type UpdateSurveyInput = SurveyInput & { surveyId: string };

/**
 * Saves an edited survey (save_survey). Questions keep their ids, so the
 * answers already given stay with them.
 */
export const useUpdateSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ surveyId, ...input }: UpdateSurveyInput) => {
      const { error } = await supabase.rpc("save_survey", {
        ...toSaveSurveyArgs(input),
        p_survey_id: surveyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["surveyResults"] });
      Alert.alert("Éxito", "Encuesta actualizada correctamente.");
    },
    onError: (error) => {
      console.error("Error updating survey:", error);
      Alert.alert("Error", "No se pudo actualizar la encuesta.");
    },
  });
};
