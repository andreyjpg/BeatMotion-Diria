import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import zod from "zod";
import { questionTypeSchema } from "./surveySchema";

export type SurveyResults = {
  surveyId: string;
  totalResponses: number;
  /** Average 1-5 per rating question, over the answers it got. */
  averageRatings: Record<string, number>;
  /** Times each option was chosen, per multiple choice question. */
  responseDistribution: Record<string, Record<string, number>>;
  textResponses: Record<string, string[]>;
  /** Responses over the course's current students, in percent. */
  completionRate: number;
};

const answersSchema = zod.array(
  zod.object({
    questionId: zod.string(),
    rating: zod.number().nullable(),
    textValue: zod.string().nullable(),
    question: zod.object({ questionType: questionTypeSchema }),
  }),
);

/** Admin: totals per question of a survey. */
export const useSurveyResults = (surveyId: string) => {
  const fetchResults = async (): Promise<SurveyResults> => {
    const { data: survey, error: surveyError } = await supabase
      .from("surveys")
      .select("course_id")
      .eq("id", surveyId)
      .single();
    if (surveyError) throw surveyError;

    const [answerRows, responses, students] = await Promise.all([
      supabase
        .from("survey_answers")
        .select(
          "questionId:question_id, rating, textValue:text_value, question:survey_questions!inner(questionType:question_type, survey_id)",
        )
        .eq("question.survey_id", surveyId),
      supabase
        .from("survey_responses")
        .select("id", { count: "exact", head: true })
        .eq("survey_id", surveyId),
      supabase
        .from("course_members")
        .select("id", { count: "exact", head: true })
        .eq("course_id", survey.course_id)
        .eq("active", true),
    ]);
    if (answerRows.error) throw answerRows.error;
    if (responses.error) throw responses.error;
    if (students.error) throw students.error;

    const ratingSums: Record<string, { total: number; count: number }> = {};
    const responseDistribution: Record<string, Record<string, number>> = {};
    const textResponses: Record<string, string[]> = {};

    for (const answer of answersSchema.parse(answerRows.data)) {
      const { questionId } = answer;
      if (answer.question.questionType === "rating" && answer.rating !== null) {
        const sum = (ratingSums[questionId] ??= { total: 0, count: 0 });
        sum.total += answer.rating;
        sum.count += 1;
      } else if (answer.question.questionType === "multiple_choice" && answer.textValue) {
        const options = (responseDistribution[questionId] ??= {});
        options[answer.textValue] = (options[answer.textValue] ?? 0) + 1;
      } else if (answer.question.questionType === "text" && answer.textValue) {
        (textResponses[questionId] ??= []).push(answer.textValue);
      }
    }

    const averageRatings = Object.fromEntries(
      Object.entries(ratingSums).map(([questionId, { total, count }]) => [
        questionId,
        Math.round((total / count) * 10) / 10,
      ]),
    );
    const totalResponses = responses.count ?? 0;
    const studentCount = students.count ?? 0;

    return {
      surveyId,
      totalResponses,
      averageRatings,
      responseDistribution,
      textResponses,
      completionRate: studentCount > 0 ? Math.min(100, (totalResponses / studentCount) * 100) : 0,
    };
  };

  return useQuery({
    queryKey: ["surveyResults", surveyId],
    queryFn: fetchResults,
    enabled: !!surveyId,
    staleTime: 1000 * 60 * 5,
  });
};
