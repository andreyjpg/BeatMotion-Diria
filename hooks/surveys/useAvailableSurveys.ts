import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { SURVEY_COLUMNS, surveyListSchema, toSurvey } from "./surveySchema";

/**
 * Surveys the signed-in student can answer: active, not expired, for one of
 * their current courses, and not answered yet.
 */
export const useAvailableSurveys = () => {
  const { user } = useActiveUser();
  const userId = user?.uid ?? "";

  const fetchAvailableSurveys = async () => {
    const [memberships, answered] = await Promise.all([
      supabase.from("course_members").select("course_id").eq("user_id", userId).eq("active", true),
      supabase.from("survey_responses").select("survey_id").eq("user_id", userId),
    ]);
    if (memberships.error) throw memberships.error;
    if (answered.error) throw answered.error;

    const courseIds = memberships.data.map((row) => row.course_id);
    if (courseIds.length === 0) return [];

    const { data, error } = await supabase
      .from("surveys")
      .select(SURVEY_COLUMNS)
      .in("course_id", courseIds)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const answeredIds = new Set(answered.data.map((row) => row.survey_id));
    return surveyListSchema.parse(
      data.filter((survey) => !answeredIds.has(survey.id)).map(toSurvey),
    );
  };

  return useQuery({
    queryKey: ["surveys", "available", userId],
    queryFn: fetchAvailableSurveys,
    enabled: !!userId,
    staleTime: 1000 * 60 * 3,
  });
};
