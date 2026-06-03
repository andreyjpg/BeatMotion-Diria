import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import { useSurveyResponses } from "@/hooks/surveys/useSurveyResponses";
import { useSurveyResults } from "@/hooks/surveys/useSurveyResults";
import { useSurveyById } from "@/hooks/surveys/useSurveyById";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SurveyResultsScreen() {
  const { surveyId } = useLocalSearchParams<{ surveyId: string }>();

  const surveyQuery = useSurveyById(surveyId);
  const resultsQuery = useSurveyResults(surveyId);
  const responsesQuery = useSurveyResponses(surveyId);

  const renderStars = (rating: number) => {
    return (
      <View className="flex-row gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= Math.round(rating) ? "star" : "star-outline"}
            size={20}
            color="#facc15"
          />
        ))}
        <Text className="text-white ml-2 font-bold">{rating.toFixed(1)}</Text>
      </View>
    );
  };

  const renderProgressBar = (value: number, total: number, color: string) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
      <View className="flex-1">
        <View className="bg-gray-800 rounded-full h-3 overflow-hidden">
          <View
            className={`h-full rounded-full ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </View>
        <Text className="text-gray-400 text-xs mt-1">
          {value} ({percentage.toFixed(0)}%)
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle
        title="Resultados de Encuesta"
        subtitle="Análisis de respuestas"
      />

      <DataLoader query={surveyQuery} emptyMessage="Encuesta no encontrada">
        {(survey) => (
          <DataLoader query={resultsQuery} emptyMessage="No hay respuestas aún">
            {(results, isRefetching, refetch) => (
              <ScrollView
                className="flex-1 px-6"
                refreshControl={
                  <RefreshControl
                    refreshing={isRefetching}
                    onRefresh={refetch}
                    tintColor="#40E0D0"
                  />
                }
              >
                <View className="bg-gray-900 rounded-3xl p-6 mb-6">
                  <Text className="text-white text-xl font-bold mb-4">
                    {survey.title}
                  </Text>

                  <View className="flex-row gap-4">
                    <View className="flex-1 bg-gray-800 rounded-2xl p-4 items-center">
                      <Text className="text-4xl font-bold text-primary">
                        {results.totalResponses}
                      </Text>
                      <Text className="text-gray-400 text-sm mt-1">
                        Respuestas
                      </Text>
                    </View>

                    <View className="flex-1 bg-gray-800 rounded-2xl p-4 items-center">
                      <Text className="text-4xl font-bold text-green-400">
                        {results.completionRate.toFixed(0)}%
                      </Text>
                      <Text className="text-gray-400 text-sm mt-1">
                        Completado
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Preguntas y resultados */}
                {survey.questions.map((question, index) => (
                  <View
                    key={question.id}
                    className="bg-gray-900 rounded-3xl p-5 mb-4"
                  >
                    <Text className="text-primary font-semibold mb-2">
                      Pregunta {index + 1}
                    </Text>
                    <Text className="text-white text-base mb-4">
                      {question.questionText}
                    </Text>

                    {/* Rating */}
                    {question.questionType === "rating" && (
                      <View>
                        {results.averageRatings[question.id] ? (
                          <View className="bg-gray-800 rounded-2xl p-4 items-center">
                            <Text className="text-gray-400 text-sm mb-2">
                              Promedio
                            </Text>
                            {renderStars(results.averageRatings[question.id])}
                            <Text className="text-gray-400 text-xs mt-2">
                              Basado en {results.totalResponses} respuestas
                            </Text>
                          </View>
                        ) : (
                          <Text className="text-gray-500 text-center italic">
                            Sin respuestas aún
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Multiple Choice */}
                    {question.questionType === "multiple_choice" && (
                      <View>
                        {results.responseDistribution[question.id] ? (
                          <View className="gap-3">
                            {Object.entries(
                              results.responseDistribution[question.id]
                            )
                              .sort((a, b) => b[1] - a[1])
                              .map(([option, count]) => (
                                <View key={option} className="gap-2">
                                  <Text className="text-white">{option}</Text>
                                  {renderProgressBar(
                                    count,
                                    results.totalResponses,
                                    "bg-primary"
                                  )}
                                </View>
                              ))}
                          </View>
                        ) : (
                          <Text className="text-gray-500 text-center italic">
                            Sin respuestas aún
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Text Responses */}
                    {question.questionType === "text" && (
                      <View>
                        {results.textResponses[question.id] &&
                        results.textResponses[question.id].length > 0 ? (
                          <View className="gap-2">
                            <Text className="text-gray-400 text-sm mb-2">
                              {results.textResponses[question.id].length}{" "}
                              respuestas:
                            </Text>
                            {results.textResponses[question.id].map(
                              (response, idx) => (
                                <View
                                  key={idx}
                                  className="bg-gray-800 rounded-xl p-3"
                                >
                                  <Text className="text-white"></Text>
                                </View>
                              )
                            )}
                          </View>
                        ) : (
                          <Text className="text-gray-500 text-center italic">
                            Sin respuestas aún
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                ))}

                {/* Lista de respondientes */}
                <View className="bg-gray-900 rounded-3xl p-5 mb-6">
                  <Text className="text-white text-lg font-bold mb-4">
                    Respuestas ({responsesQuery.data?.length || 0})
                  </Text>
                  <DataLoader
                    query={responsesQuery}
                    emptyMessage="No hay respuestas"
                  >
                    {(responses) => (
                      <View className="gap-2">
                        {responses.map((response) => (
                          <View
                            key={response.id}
                            className="bg-gray-800 rounded-xl p-3 flex-row items-center justify-between"
                          >
                            <View className="flex-1">
                              <Text className="text-white">
                                {response.userName || "Usuario"}
                              </Text>
                              <Text className="text-gray-400 text-xs">
                                {new Date(
                                  response.submittedAt
                                ).toLocaleDateString()}{" "}
                                -{" "}
                                {new Date(
                                  response.submittedAt
                                ).toLocaleTimeString()}
                              </Text>
                            </View>
                            {response.completionTimeSeconds && (
                              <Text className="text-gray-500 text-xs">
                                {Math.round(
                                  response.completionTimeSeconds / 60
                                )}
                                min
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </DataLoader>
                </View>
              </ScrollView>
            )}
          </DataLoader>
        )}
      </DataLoader>
    </SafeAreaView>
  );
}
