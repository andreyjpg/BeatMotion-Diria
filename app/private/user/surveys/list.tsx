import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import { useCourseMemberByUser } from "@/hooks/courseMember/useCourseMemberByUser";
import { useAvailableSurveys } from "@/hooks/surveys/useAvailableSurveys";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StudentSurveysScreen() {
  const router = useRouter();
  const { user } = useActiveUser();

  const courseMemberQuery = useCourseMemberByUser(user?.uid || "");

  const courseIds = courseMemberQuery.data?.map((cm) => cm.courseId) || [];

  const surveysQuery = useAvailableSurveys(user?.uid || "", courseIds);

  const handleTakeSurvey = (surveyId: string) => {
    router.push(`/private/user/surveys/take/${surveyId}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle
        title="Encuestas Disponibles"
        subtitle="Tu opinión nos ayuda a mejorar"
      />

      <DataLoader
        query={surveysQuery}
        emptyMessage="No hay encuestas disponibles en este momento."
      >
        {(surveys, isRefetching, refetch) => (
          <FlatList
            data={surveys}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#40E0D0"
              />
            }
            renderItem={({ item: survey }) => (
              <TouchableOpacity
                className="bg-gray-900 rounded-3xl p-5 mb-4"
                onPress={() => handleTakeSurvey(survey.id)}
                activeOpacity={0.8}
              >
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
                  <View className="bg-primary px-3 py-1 rounded-full">
                    <Text className="text-black text-xs font-semibold">
                      Nueva
                    </Text>
                  </View>
                </View>

                {/* Info */}
                <View className="flex-row items-center gap-4 mb-4">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="help-circle-outline" size={16} color="#9CA3AF" />
                    <Text className="text-gray-400 text-sm">
                      {survey.questions.length} preguntas
                    </Text>
                  </View>
                  {survey.courseName && (
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="book-outline" size={16} color="#9CA3AF" />
                      <Text className="text-gray-400 text-sm">
                        {survey.courseName}
                      </Text>
                    </View>
                  )}
                </View>

                {survey.expiresAt && (
                  <View className="flex-row items-center gap-2 mb-4">
                    <Ionicons name="time-outline" size={16} color="#facc15" />
                    <Text className="text-yellow-400 text-xs">
                      Expira: {new Date(survey.expiresAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <View className="bg-primary rounded-xl py-3 items-center flex-row justify-center gap-2">
                  <Ionicons name="create-outline" size={20} color="black" />
                  <Text className="text-black font-bold">
                    Responder Encuesta
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </DataLoader>
    </SafeAreaView>
  );
}
