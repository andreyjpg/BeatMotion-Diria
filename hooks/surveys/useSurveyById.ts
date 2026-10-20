import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { SURVEY_COLUMNS, surveySchema, toSurvey } from "./surveySchema";

/** One survey with its questions in order, or null if it doesn't exist. */
export const useSurveyById = (surveyId?: string) => {
  const fetchSurvey = async () => {
    const { data, error } = await supabase
      .from("surveys")
      .select(SURVEY_COLUMNS)
      .eq("id", surveyId!)
      .maybeSingle();
    if (error) throw error;
    return data ? surveySchema.parse(toSurvey(data)) : null;
  };

  return useQuery({
    queryKey: ["surveys", "byId", surveyId],
    queryFn: fetchSurvey,
    enabled: !!surveyId,
  });
};
