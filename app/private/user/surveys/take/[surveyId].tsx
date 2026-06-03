import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import { useSurveyById } from "@/hooks/surveys/useSurveyById";
import { useSubmitSurveyResponse } from "@/hooks/surveys/useSubmitSurveyResponse";
import {
  QuestionResponse,
  SurveyQuestion,
} from "@/hooks/surveys/surveySchema";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TakeSurveyScreen() {
  const router = useRouter();
  const { surveyId } = useLocalSearchParams<{ surveyId: string }>();
  const { user } = useActiveUser();

  const surveyQuery = useSurveyById(surveyId);
  const submitResponse = useSubmitSurveyResponse();

  const [responses, setResponses] = useState<Record<string, any>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());

  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  const handleRatingChange = (questionId: string, rating: number) => {
    setResponses({ ...responses, [questionId]: rating });
  };

  const handleMultipleChoiceChange = (questionId: string, option: string) => {
    setResponses({ ...responses, [questionId]: option });
  };

  const handleTextChange = (questionId: string, text: string) => {
    setResponses({ ...responses, [questionId]: text });
  };

  const validateResponses = (questions: SurveyQuestion[]) => {
    for (const question of questions) {
      if (question.required) {
        const response = responses[question.id];
        if (!response || (typeof response === "string" && !response.trim())) {
          Alert.alert(
            "Pregunta requerida",
            `Por favor responde: "${question.questionText}"`
          );
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!surveyQuery.data) return;

    if (!validateResponses(surveyQuery.data.questions)) {
      return;
    }

    const questionResponses: QuestionResponse[] =
      surveyQuery.data.questions.map((q) => ({
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        response: responses[q.id] || "",
      }));

    const completionTimeSeconds = Math.round((Date.now() - startTime) / 1000);

    try {
      await submitResponse.mutateAsync({
        surveyId: surveyQuery.data.id,
        userId: user?.uid || "",
        courseId: surveyQuery.data.courseId,
        responses: questionResponses,
        completionTimeSeconds,
      });

      router.back();
    } catch (error) {
      console.error("Error submitting survey:", error);
    }
  };

  const renderRatingQuestion = (question: SurveyQuestion) => {
    const currentRating = responses[question.id] || 0;

    return (
      <View className="flex-row justify-center gap-2 mt-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRatingChange(question.id, star)}
            className="p-2"
          >
            <Ionicons
              name={star <= currentRating ? "star" : "star-outline"}
              size={40}
              color={star <= currentRating ? "#facc15" : "#9CA3AF"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMultipleChoiceQuestion = (question: SurveyQuestion) => {
    const currentSelection = responses[question.id];

    return (
      <View className="mt-3 gap-2">
        {question.options?.map((option, index) => {
          const isSelected = currentSelection === option;
          return (
            <TouchableOpacity
              key={index}
              className={`rounded-xl p-4 border-2 ${
                isSelected
                  ? "border-primary"
                  : "bg-gray-800 border-gray-700"
              }`}
              style={isSelected ? { backgroundColor: "rgba(64, 224, 208, 0.2)" } : undefined}
              onPress={() => handleMultipleChoiceChange(question.id, option)}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isSelected ? "border-primary bg-primary" : "border-gray-500"
                  }`}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="black" />
                  )}
                </View>
                <Text
                  className={`flex-1 ${
                    isSelected ? "text-white font-semibold" : "text-gray-300"
                  }`}
                >
                  {option}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderTextQuestion = (question: SurveyQuestion) => {
    return (
      <TextInput
        className="bg-gray-800 text-white rounded-xl px-4 py-3 mt-3 min-h-24"
        value={responses[question.id] || ""}
        onChangeText={(text) => handleTextChange(question.id, text)}
        placeholder="Escribe tu respuesta aquí..."
        placeholderTextColor="#9CA3AF"
        multiline
        textAlignVertical="top"
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle title="Responder Encuesta" subtitle="Tu opinión es importante" />

      <DataLoader query={surveyQuery} emptyMessage="Encuesta no encontrada">
        {(survey) => (
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Header de encuesta */}
            <View className="bg-gray-900 rounded-3xl p-6 mb-6">
              <Text className="text-white text-2xl font-bold mb-2">
                {survey.title}
              </Text>
              {survey.description && (
                <Text className="text-gray-400 mb-4">{survey.description}</Text>
              )}
              <View className="flex-row items-center gap-4">
                <View className="flex-row items-center gap-1">
                  <Ionicons name="help-circle-outline" size={16} color="#9CA3AF" />
                  <Text className="text-gray-400 text-sm">
                    {survey.questions.length} preguntas
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                  <Text className="text-gray-400 text-sm">~5 min</Text>
                </View>
              </View>
            </View>

            {/* Preguntas */}
            {survey.questions.map((question, index) => (
              <View key={question.id} className="bg-gray-900 rounded-3xl p-5 mb-4">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-primary font-semibold mb-1">
                      Pregunta {index + 1}
                      {question.required && (
                        <Text className="text-red-400"> *</Text>
                      )}
                    </Text>
                    <Text className="text-white text-base">
                      {question.questionText}
                    </Text>
                  </View>
                </View>

                {question.questionType === "rating" &&
                  renderRatingQuestion(question)}
                {question.questionType === "multiple_choice" &&
                  renderMultipleChoiceQuestion(question)}
                {question.questionType === "text" && renderTextQuestion(question)}
              </View>
            ))}

            {/* Botón enviar */}
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 items-center mb-4"
              onPress={handleSubmit}
              disabled={submitResponse.isPending}
            >
              <Text className="text-black font-bold text-base">
                {submitResponse.isPending ? "Enviando..." : "Enviar Respuestas"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-800 rounded-2xl py-3 items-center"
              onPress={() => router.back()}
            >
              <Text className="text-white font-semibold">Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </DataLoader>
    </SafeAreaView>
  );
}
