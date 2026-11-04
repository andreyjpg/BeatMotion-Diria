import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatDayMonth, plural } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useAvailableSurveys } from "@/hooks/surveys/useAvailableSurveys";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FlatList, RefreshControl, View } from "react-native";

const StudentSurveysScreen = () => {
  const router = useRouter();
  const surveysQuery = useAvailableSurveys();
  const count = surveysQuery.data?.length;

  return (
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow={count === undefined ? undefined : plural(count, "disponible", "disponibles")}
        title="Encuestas"
        subtitle="Tu opinión nos ayuda a mejorar las clases."
      />
      <DataLoader query={surveysQuery} emptyMessage="No hay encuestas disponibles en este momento.">
        {(surveys, isRefetching, refetch) => (
          <FlatList
            data={surveys}
            keyExtractor={(item) => item.id}
            contentContainerClassName="gap-2.5 px-3 pb-8 pt-5"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            renderItem={({ item: survey }) => (
              <Card className="gap-3">
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <Chip label="Nueva" tone="ok" />
                  {survey.courseName && (
                    <AppText variant="label" tone="muted" className="text-[10px]">
                      {survey.courseName}
                    </AppText>
                  )}
                </View>
                <View>
                  <AppText variant="bold" className="text-[19px] leading-[23px]">
                    {survey.title}
                  </AppText>
                  {survey.description && (
                    <AppText tone="muted" className="mt-1.5 text-[14px] leading-[20px]">
                      {survey.description}
                    </AppText>
                  )}
                </View>
                <View className="flex-row flex-wrap gap-3.5">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="list-outline" size={15} color={palette.muted} />
                    <AppText tone="muted" className="text-[13px]">
                      {plural(survey.questions.length, "pregunta", "preguntas")}
                    </AppText>
                  </View>
                  {survey.expiresAt && (
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="calendar-outline" size={15} color={palette.sand.ink} />
                      <AppText variant="semibold" tone="sand" className="text-[13px]">
                        {`Vence ${formatDayMonth(survey.expiresAt)}`}
                      </AppText>
                    </View>
                  )}
                </View>
                <Button
                  label="Responder"
                  onPress={() =>
                    router.push({ pathname: "/private/user/surveys/take/[surveyId]", params: { surveyId: survey.id } })
                  }
                />
              </Card>
            )}
          />
        )}
      </DataLoader>
    </Screen>
  );
};

export default StudentSurveysScreen;
