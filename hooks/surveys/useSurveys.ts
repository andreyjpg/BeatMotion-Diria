import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { SURVEY_LIST_COLUMNS, surveyWithCountListSchema, toSurvey } from "./surveySchema";

/** Admin: every survey that isn't deleted, newest first, with its response count. */
export const useSurveys = () => {
  const fetchSurveys = async () => {
    const { data, error } = await supabase
      .from("surveys")
      .select(SURVEY_LIST_COLUMNS)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return surveyWithCountListSchema.parse(
      data.map(({ responses, ...survey }) => ({
        ...toSurvey(survey),
        responseCount: responses[0]?.count ?? 0,
      })),
    );
  };

  return useQuery({
    queryKey: ["surveys", "list"],
    queryFn: fetchSurveys,
    staleTime: 1000 * 60 * 5,
  });
};
