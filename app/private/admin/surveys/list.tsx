import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Fab from "@/components/ui/Fab";
import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatDayMonth } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import type { Survey } from "@/hooks/surveys/surveySchema";
import { useDeleteSurvey } from "@/hooks/surveys/useDeleteSurvey";
import { useSetSurveyActive } from "@/hooks/surveys/useSetSurveyActive";
import { useSurveys } from "@/hooks/surveys/useSurveys";
import { useRouter } from "expo-router";
import { Alert, FlatList, RefreshControl, View } from "react-native";

/** Admin: every survey, to see its results, edit it or turn it on and off. */
const SurveysListScreen = () => {
  const router = useRouter();
  const surveysQuery = useSurveys();
  const toggleActive = useSetSurveyActive();
  const deleteSurvey = useDeleteSurvey();

  const handleToggleActive = (survey: Survey) => {
    const action = survey.isActive ? "Desactivar" : "Activar";
    Alert.alert(`¿${action} encuesta?`, `La encuesta "${survey.title}" será ${action.toLowerCase()}da.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: action,
        onPress: () => toggleActive.mutate({ surveyId: survey.id, isActive: !survey.isActive }),
      },
    ]);
  };

  const handleDeleteSurvey = (survey: Survey) => {
    Alert.alert("Eliminar encuesta", `¿Estás seguro de eliminar "${survey.title}"? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteSurvey.mutate(survey.id) },
    ]);
  };

  return (
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow="Administración"
        title="Encuestas"
        subtitle="Crea encuestas por curso y revisa las respuestas."
      />
      <DataLoader query={surveysQuery} emptyMessage="Todavía no hay encuestas.">
        {(surveys, isRefetching, refetch) => (
          <FlatList
            data={surveys}
            keyExtractor={(item) => item.id}
            // Bottom space so the floating button doesn't cover the last card.
            contentContainerClassName="gap-2.5 px-3 pb-28 pt-5"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            renderItem={({ item: survey }) => {
              const expired = !!survey.expiresAt && survey.expiresAt < new Date();
              return (
                <Card className={`gap-2.5 ${survey.isActive ? "" : "opacity-75"}`}>
                  <View className="flex-row items-center justify-between gap-2">
                    <View className="flex-1 flex-row flex-wrap gap-1.5">
                      <Chip label={survey.isActive ? "Activa" : "Inactiva"} tone={survey.isActive ? "ok" : "muted"} />
                      {survey.courseName ? <Chip label={survey.courseName} /> : null}
                    </View>
                    {survey.expiresAt && (
                      <AppText variant="label" tone="muted" className="text-[10px]">
                        {`${expired ? "Cerró" : "Vence"} ${formatDayMonth(survey.expiresAt)}`}
                      </AppText>
                    )}
                  </View>
                  <AppText variant="bold" className="text-[17px] leading-[21px]">
                    {survey.title}
                  </AppText>
                  <View className="flex-row items-baseline gap-1.5">
                    <AppText variant="heavy" className="text-[22px]">
                      {survey.responseCount}
                    </AppText>
                    <AppText tone="muted" className="text-[13px]">
                      {`${survey.responseCount === 1 ? "respuesta" : "respuestas"} · ${
                        survey.questions.length === 1 ? "1 pregunta" : `${survey.questions.length} preguntas`
                      }`}
                    </AppText>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Button
                      label="Ver resultados"
                      size="sm"
                      onPress={() =>
                        router.push({
                          pathname: "/private/admin/surveys/results/[surveyId]",
                          params: { surveyId: survey.id },
                        })
                      }
                      className="flex-1"
                    />
                    <IconButton
                      icon="create-outline"
                      tone="outline"
                      size={40}
                      onPress={() =>
                        router.push({ pathname: "/private/admin/surveys/create", params: { surveyId: survey.id } })
                      }
                      accessibilityLabel="Editar encuesta"
                    />
                    <IconButton
                      icon={survey.isActive ? "pause-outline" : "play-outline"}
                      tone="outline"
                      size={40}
                      onPress={() => handleToggleActive(survey)}
                      accessibilityLabel={survey.isActive ? "Desactivar encuesta" : "Activar encuesta"}
                    />
                    <IconButton
                      icon="trash-outline"
                      tone="outline"
                      size={40}
                      iconColor={palette.danger.DEFAULT}
                      onPress={() => handleDeleteSurvey(survey)}
                      accessibilityLabel="Eliminar encuesta"
                    />
                  </View>
                </Card>
              );
            }}
          />
        )}
      </DataLoader>

      <Fab label="Nueva encuesta" onPress={() => router.push("/private/admin/surveys/create")} />
    </Screen>
  );
};

export default SurveysListScreen;
