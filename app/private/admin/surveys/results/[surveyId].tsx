import DataLoader from "@/components/DataLoader";
import QuestionResults from "@/components/surveys/QuestionResults";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { formatDayMonth, to12hLabel } from "@/constants/helpers";
import { useSurveyById } from "@/hooks/surveys/useSurveyById";
import { useSurveyResponses } from "@/hooks/surveys/useSurveyResponses";
import { useSurveyResults } from "@/hooks/surveys/useSurveyResults";
import { useLocalSearchParams } from "expo-router";
import { RefreshControl, View } from "react-native";

/** Seconds -> "2:40". */
const formatMinutes = (seconds: number) => {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

/** Admin: how a survey's questions were answered, and who answered it. */
const SurveyResultsScreen = () => {
  const { surveyId } = useLocalSearchParams<{ surveyId: string }>();
  const surveyQuery = useSurveyById(surveyId);
  const resultsQuery = useSurveyResults(surveyId);
  const responsesQuery = useSurveyResponses(surveyId);

  const survey = surveyQuery.data;
  const responses = responsesQuery.data ?? [];
  const times = responses.flatMap((r) => (r.completionTimeSeconds === null ? [] : [r.completionTimeSeconds]));
  const averageTime = times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : null;

  const refresh = () => {
    surveyQuery.refetch();
    resultsQuery.refetch();
    responsesQuery.refetch();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={resultsQuery.isRefetching} onRefresh={refresh} />}>
      <ScreenHeader
        eyebrow={survey?.courseName ? `Resultados · ${survey.courseName}` : "Resultados"}
        title={survey?.title ?? "Encuesta"}
      />
      <DataLoader query={surveyQuery} emptyMessage="No encontramos esta encuesta.">
        {(survey) => (
          <DataLoader query={resultsQuery} emptyMessage="Todavía no hay respuestas.">
            {(results) => (
              <>
                <View className="flex-row gap-2 px-3 pt-4">
                  <Card padded={false} className="flex-1 gap-1 px-3.5 py-3">
                    <AppText variant="heavy" className="text-[26px] leading-[30px]">
                      {results.totalResponses}
                      <AppText variant="semibold" tone="muted" className="text-[15px]">
                        {` / ${results.studentCount}`}
                      </AppText>
                    </AppText>
                    <AppText tone="muted" className="text-[12px]">
                      Respondieron
                    </AppText>
                    <ProgressBar percent={results.completionRate} height={6} className="mt-1" />
                  </Card>
                  <Card padded={false} className="flex-1 gap-1 px-3.5 py-3">
                    <AppText variant="heavy" className="text-[26px] leading-[30px]">
                      {averageTime === null ? "—" : formatMinutes(averageTime)}
                    </AppText>
                    <AppText tone="muted" className="text-[12px]">
                      Minutos en promedio
                    </AppText>
                  </Card>
                </View>

                {survey.questions.map((question, index) => (
                  <QuestionResults
                    key={question.id}
                    question={question}
                    number={index + 1}
                    results={results}
                    responses={responses}
                  />
                ))}

                <SectionHeader
                  title="Quiénes respondieron"
                  note={responses.length === 1 ? "1 respuesta" : `${responses.length} respuestas`}
                />
                <DataLoader query={responsesQuery} emptyMessage="Todavía no hay respuestas.">
                  {(list) => (
                    <Card padded={false} className="mx-3 py-1">
                      {list.map((response, i) => (
                        <View
                          key={response.id}
                          className={`flex-row items-center justify-between gap-2 px-4 py-2.5 ${
                            i < list.length - 1 ? "border-b border-line-soft" : ""
                          }`}
                        >
                          <View className="flex-1">
                            <AppText variant="bold" className="text-[14.5px]" numberOfLines={1}>
                              {response.userName || "Usuario"}
                            </AppText>
                            <AppText tone="muted" className="text-[12.5px]">
                              {`${formatDayMonth(response.submittedAt)}, ${to12hLabel(response.submittedAt)}`}
                            </AppText>
                          </View>
                          {response.completionTimeSeconds !== null && (
                            <AppText tone="muted" className="text-[12.5px]">
                              {`${formatMinutes(response.completionTimeSeconds)} min`}
                            </AppText>
                          )}
                        </View>
                      ))}
                    </Card>
                  )}
                </DataLoader>
              </>
            )}
          </DataLoader>
        )}
      </DataLoader>
    </Screen>
  );
};

export default SurveyResultsScreen;
