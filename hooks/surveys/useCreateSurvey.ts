import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { SurveyInput, toSaveSurveyArgs } from "./surveySchema";

/** Creates the survey and its questions in one transaction (save_survey). */
export const useCreateSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SurveyInput) => {
      const { data, error } = await supabase.rpc("save_survey", toSaveSurveyArgs(input));
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      Alert.alert("Éxito", "Encuesta creada correctamente.");
    },
    onError: (error) => {
      console.error("Error creating survey:", error);
      Alert.alert("Error", "No se pudo crear la encuesta.");
    },
  });
};
