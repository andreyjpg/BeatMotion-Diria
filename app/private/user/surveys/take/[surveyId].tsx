import DataLoader from "@/components/DataLoader";
import FieldError from "@/components/FieldError";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { surveyAnswersSchema, validationErrors } from "@/constants/validationForms";
import type { Survey, SurveyQuestion } from "@/hooks/surveys/surveySchema";
import { useSubmitSurveyResponse } from "@/hooks/surveys/useSubmitSurveyResponse";
import { useSurveyById } from "@/hooks/surveys/useSurveyById";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

/** Answer per question id: 1-5 for ratings, text otherwise. */
type Answers = Record<string, string | number>;

const RATINGS = [1, 2, 3, 4, 5];

const secondsSince = (start: number) => Math.round((Date.now() - start) / 1000);

const TakeSurveyScreen = () => {
  const router = useRouter();
  const { surveyId } = useLocalSearchParams<{ surveyId: string }>();

  const surveyQuery = useSurveyById(surveyId);
  const submitResponse = useSubmitSurveyResponse();

  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  // When the screen opened, for the completion time.
  const [startTime] = useState(() => Date.now());

  const setAnswer = (questionId: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (survey: Survey) => {
    const formErrors = validationErrors(surveyAnswersSchema(survey.questions), answers);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    try {
      await submitResponse.mutateAsync({
        surveyId: survey.id,
        answers,
        completionTimeSeconds: secondsSince(startTime),
      });
      router.back();
    } catch {
      // useSubmitSurveyResponse already told the student what went wrong.
    }
  };

  const renderRatingQuestion = (question: SurveyQuestion) => (
    <View accessibilityRole="radiogroup" accessibilityLabel="Calificación de 1 a 5" className="flex-row gap-1.5">
      {RATINGS.map((rating) => {
        const isSelected = answers[question.id] === rating;
        return (
          <Pressable
            key={rating}
            onPress={() => setAnswer(question.id, rating)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            className={`h-[52px] flex-1 items-center justify-center rounded-xl border-[1.5px] ${
              isSelected ? "border-ink bg-ink" : "border-field-line bg-surface"
            }`}
          >
            <AppText variant="bold" tone={isSelected ? "inverse" : "ink"} className="text-[18px]">
              {rating}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  const renderMultipleChoiceQuestion = (question: SurveyQuestion) => (
    <View accessibilityRole="radiogroup" accessibilityLabel="Opciones" className="gap-2">
      {question.options?.map((option) => {
        const isSelected = answers[question.id] === option;
        return (
          <Pressable
            key={option}
            onPress={() => setAnswer(question.id, option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            className={`flex-row items-center gap-3 rounded-xl border-[1.5px] bg-surface px-3.5 py-3 ${
              isSelected ? "border-ink" : "border-field-line"
            }`}
          >
            <View
              className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                isSelected ? "border-ink" : "border-faint"
              }`}
            >
              {isSelected && <View className="h-2.5 w-2.5 rounded-full bg-ink" />}
            </View>
            <AppText variant="medium" className="flex-1 text-[15px]">
              {option}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  const survey = surveyQuery.data;

  if (!survey) {
    return (
      <Screen scroll={false}>
        <ScreenHeader nav="close" eyebrow="Encuesta" title="Responder encuesta" />
        <View className="flex-1">
          <DataLoader query={surveyQuery} emptyMessage="Encuesta no encontrada.">
            {() => null}
          </DataLoader>
        </View>
      </Screen>
    );
  }

  const total = survey.questions.length;
  const answered = survey.questions.filter((question) => {
    const answer = answers[question.id];
    return typeof answer === "number" || !!answer?.trim();
  }).length;

  return (
    <Screen
      form
      footer={
        <FormActions
          saveLabel="Enviar respuestas"
          onSave={() => handleSubmit(survey)}
          loading={submitResponse.isPending}
          hasErrors={Object.keys(errors).length > 0}
        />
      }
    >
      <ScreenHeader
        nav="close"
        eyebrow={`${answered} de ${total} respondidas`}
        title={survey.title}
        subtitle={survey.description || "Las preguntas con * son obligatorias."}
      />
      <View
        className="mx-5 mt-3.5 h-1 overflow-hidden rounded-sm bg-line-strong"
        accessible
        accessibilityLabel={`${answered} de ${total} preguntas respondidas`}
      >
        <View className="h-full bg-ink" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
      </View>

      {survey.description && (
        <AppText tone="muted" className="mx-5 mt-2.5 text-[13px]">
          Las preguntas con * son obligatorias.
        </AppText>
      )}

      {survey.questions.map((question, index) => (
        <Card
          key={question.id}
          // The border is always there, so the content doesn't move when it turns red.
          className={`mx-3 mt-2.5 gap-3 border-[1.5px] ${errors[question.id] ? "border-danger-line" : "border-surface"}`}
        >
          <View className="flex-row gap-2">
            <AppText variant="label-bold" tone="muted" className="pt-1 text-[12px] tracking-normal">
              {String(index + 1).padStart(2, "0")}
            </AppText>
            <AppText variant="bold" accessibilityRole="header" className="flex-1 text-[16px] leading-[21px]">
              {`${question.questionText}${question.required ? " *" : ""}`}
            </AppText>
          </View>

          {question.questionType === "rating" && renderRatingQuestion(question)}
          {question.questionType === "multiple_choice" && renderMultipleChoiceQuestion(question)}
          {question.questionType === "text" && (
            <Field
              label={question.questionText}
              hideLabel
              value={String(answers[question.id] ?? "")}
              onChangeText={(text) => setAnswer(question.id, text)}
              placeholder="Escribe tu respuesta aquí…"
              multiline
            />
          )}
          <FieldError message={errors[question.id]} />
        </Card>
      ))}
    </Screen>
  );
};

export default TakeSurveyScreen;
