import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import { useSurveys } from "@/hooks/surveys/useSurveys";
import { useUpdateSurvey } from "@/hooks/surveys/useUpdateSurvey";
import { useDeleteSurvey } from "@/hooks/surveys/useDeleteSurvey";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Survey } from "@/hooks/surveys/surveySchema";
import type { Href } from "expo-router";

export default function SurveysListScreen() {
  const router = useRouter();
  const surveysQuery = useSurveys();
  const toggleActive = useUpdateSurvey();
  const deleteSurvey = useDeleteSurvey();

  const handleToggleActive = (survey: Survey) => {
    const action = survey.isActive ? "desactivar" : "activar";
    Alert.alert(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} encuesta?`,
      `La encuesta "${survey.title}" será ${action}da.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: () => {
            toggleActive.mutate({
              surveyId: survey.id,
              isActive: !survey.isActive,
            });
          },
        },
      ]
    );
  };

  const handleDeleteSurvey = (survey: Survey) => {
    Alert.alert(
      "Eliminar encuesta",
      `¿Estás seguro de eliminar "${survey.title}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteSurvey.mutate(survey.id),
        },
      ]
    );
  };

  const handleViewResults = (surveyId: string) => {
    router.push(`/private/admin/surveys/results/${surveyId}`);
  };

  const handleEditSurvey = (surveyId: string) => {
    router.push(`/private/admin/surveys/create?surveyId=${surveyId}` as Href);
  };

  const handleCreateSurvey = () => {
    router.push("/private/admin/surveys/create");
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle
        title="Gestión de Encuestas"
        subtitle="Crea y administra encuestas de satisfacción"
      />

      <DataLoader
        query={surveysQuery}
        emptyMessage="No hay encuestas creadas aún."
      >
        {(surveys, isRefetching, refetch) => (
          <FlatList
            data={surveys}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#40E0D0"
              />
            }
            renderItem={({ item: survey }) => (
              <View className="bg-gray-900 rounded-3xl p-4 mb-4">
                {/* Header */}
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 mr-2">
                    <Text className="text-white text-lg font-bold">
                      {survey.title}
                    </Text>
                    {survey.description && (
                      <Text className="text-gray-400 text-sm mt-1">
                        {survey.description}
                      </Text>
                    )}
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${
                      survey.isActive ? "bg-green-600" : "bg-gray-700"
                    }`}
                  >
                    <Text className="text-white text-xs font-semibold">
                      {survey.isActive ? "Activa" : "Inactiva"}
                    </Text>
                  </View>
                </View>

                {/* Info */}
                <View className="flex-row items-center gap-4 mb-3">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="help-circle-outline" size={16} color="#9CA3AF" />
                    <Text className="text-gray-400 text-sm">
                      {survey.questions.length} preguntas
                    </Text>
                  </View>
                  {survey.courseName && (
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="book-outline" size={16} color="#9CA3AF" />
                      <Text className="text-gray-400 text-sm" numberOfLines={1}>
                        {survey.courseName}
                      </Text>
                    </View>
                  )}
                </View>

                {survey.expiresAt && (
                  <View className="flex-row items-center gap-1 mb-3">
                    <Ionicons name="time-outline" size={14} color="#facc15" />
                    <Text className="text-yellow-400 text-xs">
                      Expira: {new Date(survey.expiresAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 bg-primary rounded-xl py-2 items-center flex-row justify-center gap-1"
                    onPress={() => handleViewResults(survey.id)}
                  >
                    <Ionicons name="bar-chart-outline" size={16} color="black" />
                    <Text className="text-black font-semibold text-sm">
                      Resultados
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-gray-800 rounded-xl py-2 items-center flex-row justify-center gap-1"
                    onPress={() => handleEditSurvey(survey.id)}
                  >
                    <Ionicons name="create-outline" size={16} color="white" />
                    <Text className="text-white font-semibold text-sm">
                      Editar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="w-10 h-10 bg-gray-800 rounded-xl items-center justify-center"
                    onPress={() => handleToggleActive(survey)}
                  >
                    <Ionicons
                      name={survey.isActive ? "pause" : "play"}
                      size={20}
                      color="#40E0D0"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="w-10 h-10 bg-red-600 rounded-xl items-center justify-center"
                    onPress={() => handleDeleteSurvey(survey)}
                  >
                    <Ionicons name="trash-outline" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </DataLoader>

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-8 right-8 w-16 h-16 bg-primary rounded-full items-center justify-center shadow-lg"
        onPress={handleCreateSurvey}
        style={{
          shadowColor: "#40E0D0",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={32} color="black" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
