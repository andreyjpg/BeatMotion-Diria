import DataLoader from "@/components/DataLoader";
import FieldError from "@/components/FieldError";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import DateTimeField from "@/components/ui/DateTimeField";
import Field from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SelectField from "@/components/ui/SelectField";
import SwitchRow from "@/components/ui/SwitchRow";
import { endOfDay } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { quickSurveyTemplate } from "@/constants/surveyTemplates";
import { FormErrors, surveyFormSchema, validationErrors } from "@/constants/validationForms";
import { useCourses } from "@/hooks/courses/useCourses";
import type { QuestionType, SurveyQuestionInput } from "@/hooks/surveys/surveySchema";
import { useCreateSurvey } from "@/hooks/surveys/useCreateSurvey";
import { useSurveyById } from "@/hooks/surveys/useSurveyById";
import { useUpdateSurvey } from "@/hooks/surveys/useUpdateSurvey";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "rating", label: "Escala 1–5" },
  { value: "multiple_choice", label: "Múltiple" },
  { value: "text", label: "Texto" },
];

const TEMPLATES: { key: keyof typeof quickSurveyTemplate; title: string; detail: string }[] = [
  { key: "satisfactionBasic", title: "Satisfacción básica", detail: "3 preguntas: escala, opción múltiple y texto" },
  { key: "instructorEvaluation", title: "Evaluación del instructor", detail: "4 preguntas enfocadas en el profesor" },
  { key: "courseContent", title: "Evaluación del contenido", detail: "3 preguntas sobre el material del curso" },
];

const newQuestion = (type: QuestionType): SurveyQuestionInput => ({
  questionText: "",
  questionType: type,
  required: true,
  ...(type === "multiple_choice" ? { options: ["", ""] } : {}),
});

const CreateEditSurveyScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ surveyId?: string }>();
  const surveyId = params.surveyId;
  const isEditing = !!surveyId;

  const coursesQuery = useCourses();
  const surveyQuery = useSurveyById(surveyId);
  const createSurvey = useCreateSurvey();
  const updateSurvey = useUpdateSurvey();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestionInput[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [errors, setErrors] = useState<FormErrors<typeof surveyFormSchema>>({});

  // Prefill when editing. Saved questions keep their id so their answers stay.
  useEffect(() => {
    if (isEditing && surveyQuery.data) {
      const survey = surveyQuery.data;
      setTitle(survey.title);
      setDescription(survey.description ?? "");
      setCourseId(survey.courseId);
      setExpiresAt(survey.expiresAt);
      setQuestions(
        survey.questions.map((question) => ({
          id: question.id,
          questionText: question.questionText,
          questionType: question.questionType,
          required: question.required,
          options: question.options ?? undefined,
        })),
      );
    }
  }, [isEditing, surveyQuery.data]);

  const updateQuestion = (index: number, updates: Partial<SurveyQuestionInput>) => {
    setQuestions((prev) => prev.map((question, i) => (i === index ? { ...question, ...updates } : question)));
  };

  // A different type can't keep the old answers: it becomes a new question.
  const changeQuestionType = (index: number, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === index && question.questionType !== type
          ? { ...newQuestion(type), questionText: question.questionText, required: question.required }
          : question,
      ),
    );
  };

  const deleteQuestion = (index: number) => {
    Alert.alert(
      "Eliminar pregunta",
      isEditing
        ? "¿Estás seguro de eliminar esta pregunta? Sus respuestas también se eliminarán."
        : "¿Estás seguro de eliminar esta pregunta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => setQuestions((prev) => prev.filter((_, i) => i !== index)),
        },
      ],
    );
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;
    setQuestions((prev) => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  };

  const setOptions = (questionIndex: number, change: (options: string[]) => string[]) => {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === questionIndex ? { ...question, options: change(question.options ?? []) } : question,
      ),
    );
  };

  const applyTemplate = (templateKey: keyof typeof quickSurveyTemplate) => {
    const template = quickSurveyTemplate[templateKey];
    setTitle(template.title);
    setDescription(template.description);
    setQuestions(template.questions.map((question) => ({ ...question })));
    setShowTemplates(false);
  };

  const handleSave = async () => {
    const formErrors = validationErrors(surveyFormSchema, {
      title,
      courseId,
      questions,
      expiresAt,
      originalExpiresAt: surveyQuery.data?.expiresAt ?? null,
    });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    const input = { courseId, title, description, expiresAt, questions };
    try {
      if (isEditing) {
        await updateSurvey.mutateAsync({ ...input, surveyId });
      } else {
        await createSurvey.mutateAsync(input);
      }
      router.back();
    } catch {
      // The hook already showed the error.
    }
  };

  if (isEditing && !surveyQuery.data) {
    return (
      <Screen scroll={false}>
        <ScreenHeader nav="close" eyebrow="Encuestas" title="Editar encuesta" />
        <View className="flex-1">
          <DataLoader query={surveyQuery} emptyMessage="No encontramos esta encuesta.">
            {() => null}
          </DataLoader>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      form
      footer={
        <FormActions
          saveLabel={isEditing ? "Guardar cambios" : "Crear encuesta"}
          onSave={handleSave}
          loading={createSurvey.isPending || updateSurvey.isPending}
          hasErrors={Object.keys(errors).length > 0}
        />
      }
    >
      <ScreenHeader nav="close" eyebrow="Encuestas" title={isEditing ? "Editar encuesta" : "Nueva encuesta"} />

      {!isEditing && (
        <Card padded={false} className="mx-3 mt-4">
          <Pressable
            onPress={() => setShowTemplates(!showTemplates)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showTemplates }}
            className="flex-row items-center gap-3 px-4 py-3.5"
          >
            <Ionicons name="document-text-outline" size={20} color={palette.ink} />
            <AppText variant="semibold" className="flex-1 text-[15px]">
              Usar una plantilla
            </AppText>
            <Ionicons name={showTemplates ? "chevron-up" : "chevron-down"} size={18} color={palette.ink} />
          </Pressable>
          {showTemplates &&
            TEMPLATES.map((template) => (
              <Pressable
                key={template.key}
                onPress={() => applyTemplate(template.key)}
                accessibilityRole="button"
                className="gap-0.5 border-t border-line-soft px-4 py-3 active:opacity-70"
              >
                <AppText variant="bold" className="text-[14.5px]">
                  {template.title}
                </AppText>
                <AppText tone="muted" className="text-[12.5px]">
                  {template.detail}
                </AppText>
              </Pressable>
            ))}
        </Card>
      )}

      <Card className={`mx-3 gap-3.5 ${isEditing ? "mt-4" : "mt-2.5"}`}>
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Datos
        </AppText>
        <Field
          label="Título *"
          value={title}
          onChangeText={setTitle}
          placeholder="¿Cómo vas en Salsa Nivel 1?"
          error={errors.title}
        />
        <Field
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe brevemente el propósito de la encuesta"
          multiline
        />
        {/* A survey stays in its course: only new ones choose it. */}
        <SelectField
          label="Curso *"
          value={courseId}
          onChange={setCourseId}
          options={(coursesQuery.data ?? []).map((course) => ({ value: course.id, label: course.title }))}
          placeholder={coursesQuery.isLoading ? "Cargando cursos…" : "Selecciona un curso"}
          disabled={isEditing}
          error={errors.courseId}
        />
        <DateTimeField
          label="Vence"
          mode="date"
          value={expiresAt}
          onChange={(date) => setExpiresAt(endOfDay(date))}
          onClear={() => setExpiresAt(null)}
          hint="Se cierra al terminar ese día. Déjala vacía para que no venza."
          error={errors.expiresAt}
        />
      </Card>

      {questions.map((question, index) => (
        <Card key={index} className="mx-3 mt-2.5 gap-3">
          <View className="flex-row items-center gap-1.5">
            <View className="h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-ink">
              <AppText variant="label-bold" tone="inverse" className="text-[12px]">
                {String(index + 1).padStart(2, "0")}
              </AppText>
            </View>
            <View className="flex-1" />
            <IconButton
              icon="arrow-up"
              tone="outline"
              size={36}
              onPress={() => moveQuestion(index, "up")}
              disabled={index === 0}
              accessibilityLabel={`Subir pregunta ${index + 1}`}
            />
            <IconButton
              icon="arrow-down"
              tone="outline"
              size={36}
              onPress={() => moveQuestion(index, "down")}
              disabled={index === questions.length - 1}
              accessibilityLabel={`Bajar pregunta ${index + 1}`}
            />
            <IconButton
              icon="trash-outline"
              tone="outline"
              size={36}
              iconColor={palette.danger.DEFAULT}
              onPress={() => deleteQuestion(index)}
              accessibilityLabel={`Eliminar pregunta ${index + 1}`}
            />
          </View>

          <SegmentedControl
            segments={QUESTION_TYPES}
            value={question.questionType}
            onChange={(type) => changeQuestionType(index, type)}
            tone="dark"
            accessibilityLabel={`Tipo de la pregunta ${index + 1}`}
          />

          <Field
            label={`Pregunta ${index + 1}`}
            hideLabel
            value={question.questionText}
            onChangeText={(text) => updateQuestion(index, { questionText: text })}
            placeholder="Escribe la pregunta"
            // Long questions wrap; on one line Android hides how they start.
            multiline
          />

          {question.questionType === "multiple_choice" && (
            <View className="gap-2">
              <AppText variant="label" tone="muted" className="text-[10px]">
                Opciones
              </AppText>
              {question.options?.map((option, optionIndex) => (
                <View key={optionIndex} className="flex-row items-center gap-2">
                  <Field
                    label={`Opción ${optionIndex + 1}`}
                    hideLabel
                    value={option}
                    onChangeText={(text) =>
                      setOptions(index, (options) => options.map((o, i) => (i === optionIndex ? text : o)))
                    }
                    placeholder={`Opción ${optionIndex + 1}`}
                    className="flex-1"
                  />
                  {(question.options ?? []).length > 2 && (
                    <IconButton
                      icon="close"
                      tone="outline"
                      size={36}
                      onPress={() => setOptions(index, (options) => options.filter((_, i) => i !== optionIndex))}
                      accessibilityLabel={`Quitar opción ${optionIndex + 1}`}
                    />
                  )}
                </View>
              ))}
              <Pressable
                onPress={() => setOptions(index, (options) => [...options, ""])}
                accessibilityRole="button"
                hitSlop={8}
                className="self-start py-1"
              >
                <AppText variant="semibold" className="text-[14px] underline">
                  + Agregar opción
                </AppText>
              </Pressable>
            </View>
          )}

          <SwitchRow
            title="Pregunta obligatoria"
            value={question.required}
            onChange={(required) => updateQuestion(index, { required })}
          />
        </Card>
      ))}

      <FieldError message={errors.questions} className="mx-5 mt-3" />

      <Pressable
        onPress={() => setQuestions((prev) => [...prev, newQuestion("rating")])}
        accessibilityRole="button"
        className="mx-3 mt-2.5 h-14 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-faint active:opacity-70"
      >
        <Ionicons name="add" size={20} color={palette.ink} />
        <AppText variant="semibold" className="text-[15px]">
          Agregar pregunta
        </AppText>
      </Pressable>
    </Screen>
  );
};

export default CreateEditSurveyScreen;
