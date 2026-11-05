import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatDayMonth } from "@/constants/helpers";
import type { SurveyQuestion, SurveyResponse } from "@/hooks/surveys/surveySchema";
import type { SurveyResults } from "@/hooks/surveys/useSurveyResults";
import { View } from "react-native";

const SCORES = [5, 4, 3, 2, 1];

const NoAnswers = () => (
  <AppText tone="faint" className="text-[14px]">
    Sin respuestas todavía.
  </AppText>
);

type QuestionResultsProps = {
  question: SurveyQuestion;
  /** Its position in the survey, from 1. */
  number: number;
  results: SurveyResults;
  responses: SurveyResponse[];
};

/** How one question was answered: scores, chosen options or the students' words. */
const QuestionResults = ({ question, number, results, responses }: QuestionResultsProps) => {
  const average = results.averageRatings[question.id];
  const scores = results.ratingDistribution[question.id] ?? {};
  const topScore = Math.max(1, ...SCORES.map((score) => scores[score] ?? 0));
  const chosen = results.responseDistribution[question.id] ?? {};
  const options = [...new Set([...(question.options ?? []), ...Object.keys(chosen)])].sort(
    (a, b) => (chosen[b] ?? 0) - (chosen[a] ?? 0),
  );
  const texts = responses.flatMap((response) =>
    response.answers
      .filter((answer) => answer.questionId === question.id && answer.textValue)
      .map((answer) => ({ id: response.id, text: answer.textValue, response })),
  );

  return (
    <Card className="mx-3 mt-2.5 gap-3">
      <View className="flex-row gap-2">
        <AppText variant="label-bold" tone="muted" className="pt-0.5 text-[12px]">
          {String(number).padStart(2, "0")}
        </AppText>
        <AppText variant="bold" className="flex-1 text-[15px] leading-[20px]">
          {question.questionText}
        </AppText>
      </View>

      {question.questionType === "rating" &&
        (average ? (
          <View className="flex-row items-center gap-4">
            <View>
              <AppText variant="heavy" className="text-[40px] leading-[44px]">
                {average.toFixed(1).replace(".", ",")}
              </AppText>
              <AppText tone="muted" className="text-[12px]">
                de 5
              </AppText>
            </View>
            <View className="flex-1 gap-1.5">
              {SCORES.map((score) => (
                <View key={score} className="flex-row items-center gap-2">
                  <AppText variant="label" className="w-3 text-[10.5px]">
                    {score}
                  </AppText>
                  <ProgressBar percent={((scores[score] ?? 0) / topScore) * 100} className="flex-1" />
                  <AppText variant="bold" className="w-5 text-right text-[12.5px]">
                    {scores[score] ?? 0}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <NoAnswers />
        ))}

      {question.questionType === "multiple_choice" &&
        (Object.keys(chosen).length > 0 ? (
          <View className="gap-2.5">
            {options.map((option) => {
              const percent = results.totalResponses > 0 ? ((chosen[option] ?? 0) / results.totalResponses) * 100 : 0;
              return (
                <View key={option} className="gap-1">
                  <View className="flex-row justify-between gap-2">
                    <AppText className="flex-1 text-[14px]">{option}</AppText>
                    <AppText variant="bold" className="text-[14px]">
                      {`${Math.round(percent)}%`}
                    </AppText>
                  </View>
                  <ProgressBar percent={percent} />
                </View>
              );
            })}
          </View>
        ) : (
          <NoAnswers />
        ))}

      {question.questionType === "text" &&
        (texts.length > 0 ? (
          <View className="gap-2">
            {texts.map(({ id, text, response }) => (
              <View key={id} className="gap-1 rounded-xl bg-field px-3 py-2.5">
                <AppText className="text-[14px] leading-[20px]">{`“${text}”`}</AppText>
                <AppText variant="label" tone="muted" className="text-[10px]">
                  {`${response.userName || "Usuario"} · ${formatDayMonth(response.submittedAt)}`}
                </AppText>
              </View>
            ))}
          </View>
        ) : (
          <NoAnswers />
        ))}
    </Card>
  );
};

export default QuestionResults;
