import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { SURVEY_RESPONSE_COLUMNS, surveyResponseListSchema, toSurveyResponse } from "./surveySchema";

/** Admin: every response to a survey with the student's name, newest first. */
export const useSurveyResponses = (surveyId: string) => {
  const fetchResponses = async () => {
    const { data, error } = await supabase
      .from("survey_responses")
      .select(SURVEY_RESPONSE_COLUMNS)
      .eq("survey_id", surveyId)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return surveyResponseListSchema.parse(data.map(toSurveyResponse));
  };

  return useQuery({
    queryKey: ["surveyResponses", surveyId],
    queryFn: fetchResponses,
    enabled: !!surveyId,
    staleTime: 1000 * 60 * 2,
  });
};
