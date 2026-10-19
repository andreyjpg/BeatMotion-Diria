import { isUniqueViolation } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { SUBMIT_ERROR_MESSAGES } from "./surveySchema";

type SubmitSurveyResponseInput = {
  surveyId: string;
  /** Answer per question id: 1-5 for ratings, text otherwise. */
  answers: Record<string, string | number>;
  completionTimeSeconds: number;
};

/**
 * The student's response with all its answers, in one transaction. The
 * database checks the survey is open, the student is in the course and the
 * answers are valid (submit_survey_response).
 */
export const useSubmitSurveyResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ surveyId, answers, completionTimeSeconds }: SubmitSurveyResponseInput) => {
      const { data, error } = await supabase.rpc("submit_survey_response", {
        p_survey_id: surveyId,
        p_answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value: String(value),
        })),
        p_completion_time_seconds: completionTimeSeconds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys", "available"] });
      queryClient.invalidateQueries({ queryKey: ["surveyResponses"] });
      queryClient.invalidateQueries({ queryKey: ["surveyResults"] });
      Alert.alert(
        "¡Gracias!",
        "Tu respuesta ha sido enviada correctamente. Tu opinión nos ayuda a mejorar.",
      );
    },
    onError: (error) => {
      console.error("Error submitting survey response:", error);
      Alert.alert(
        "Error",
        isUniqueViolation(error)
          ? "Ya respondiste esta encuesta."
          : (SUBMIT_ERROR_MESSAGES[error.message] ??
              "No se pudo enviar tu respuesta. Intenta de nuevo."),
      );
    },
  });
};
