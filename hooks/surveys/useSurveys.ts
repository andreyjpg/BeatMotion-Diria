import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { SURVEY_COLUMNS, surveyListSchema, toSurvey } from "./surveySchema";

/** Admin: every survey that isn't deleted, newest first. */
export const useSurveys = () => {
  const fetchSurveys = async () => {
    const { data, error } = await supabase
      .from("surveys")
      .select(SURVEY_COLUMNS)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return surveyListSchema.parse(data.map(toSurvey));
  };

  return useQuery({
    queryKey: ["surveys", "list"],
    queryFn: fetchSurveys,
    staleTime: 1000 * 60 * 5,
  });
};
