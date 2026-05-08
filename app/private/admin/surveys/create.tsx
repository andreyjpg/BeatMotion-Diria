import HeaderTitle from "@/components/headerTitle";
import { useCourses } from "@/hooks/courses/useCourses";
import { useCreateSurvey } from "@/hooks/surveys/useCreateSurvey";
import { useUpdateSurvey } from "@/hooks/surveys/useUpdateSurvey";
import { useSurveyById } from "@/hooks/surveys/useSurveyById";
import {
  SurveyQuestion,
  QuestionType,
  quickSurveyTemplate,
} from "@/hooks/surveys/surveySchema";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DataLoader from "@/components/DataLoader";

export default function CreateEditSurveyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surveyId?: string }>();
  const surveyId = params.surveyId;
  const isEditing = !!surveyId;

  const { user } = useActiveUser();
  const coursesQuery = useCourses();
  const surveyQuery = useSurveyById(surveyId || "");
  const createSurvey = useCreateSurvey();
  const updateSurvey = useUpdateSurvey();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [questions, setQuestions] = useState<Omit<SurveyQuestion, "id">[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (isEditing && surveyQuery.data) {
      const survey = surveyQuery.data;
      setTitle(survey.title);
      setDescription(survey.description || "");
      setCourseId(survey.courseId);
      setExpiresAt(survey.expiresAt ? new Date(survey.expiresAt) : null);
      setQuestions(
        survey.questions.map(({ id, ...rest }) => rest)
      );
    }
  }, [isEditing, surveyQuery.data]);

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Omit<SurveyQuestion, "id"> = {
      questionText: "",
      questionType: type,
      required: true,
      order: questions.length,
      ...(type === "multiple_choice" ? { options: ["", ""] } : {}),
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (
    index: number,
    updates: Partial<Omit<SurveyQuestion, "id">>
  ) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    Alert.alert(
      "Eliminar pregunta",
      "¿Estás seguro de eliminar esta pregunta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            const updated = questions.filter((_, i) => i !== index);
            setQuestions(updated.map((q, i) => ({ ...q, order: i })));
          },
        },
      ]
    );
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === questions.length - 1)
    ) {
      return;
    }

    const updated = [...questions];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setQuestions(updated.map((q, i) => ({ ...q, order: i })));
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options = [
        ...(updated[questionIndex].options || []),
        "",
      ];
      setQuestions(updated);
    }
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex] = value;
      setQuestions(updated);
    }
  };

  const deleteOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options = updated[questionIndex].options!.filter(
        (_, i) => i !== optionIndex
      );
      setQuestions(updated);
    }
  };

  const applyTemplate = (templateKey: keyof typeof quickSurveyTemplate) => {
    const template = quickSurveyTemplate[templateKey];
    setTitle(template.title);
    setDescription(template.description);
    setQuestions(template.questions.map(({ id, ...rest }) => rest));
    setShowTemplates(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Debes ingresar un título para la encuesta.");
      return;
    }

    if (!courseId) {
      Alert.alert("Error", "Debes seleccionar un curso.");
      return;
    }

    if (questions.length === 0) {
      Alert.alert("Error", "Debes agregar al menos una pregunta.");
      return;
    }

    const emptyQuestions = questions.filter((q) => !q.questionText.trim());
    if (emptyQuestions.length > 0) {
      Alert.alert("Error", "Todas las preguntas deben tener texto.");
      return;
    }

    for (const q of questions) {
      if (q.questionType === "multiple_choice") {
        if (!q.options || q.options.length < 2) {
          Alert.alert(
            "Error",
            "Las preguntas de opción múltiple deben tener al menos 2 opciones."
          );
          return;
        }
        const emptyOptions = q.options.filter((opt) => !opt.trim());
        if (emptyOptions.length > 0) {
          Alert.alert("Error", "Todas las opciones deben tener texto.");
          return;
        }
      }
    }

    try {
      if (isEditing) {
        await updateSurvey.mutateAsync({
          surveyId: surveyId!,
          title,
          description,
          questions: questions.map((q, i) => ({
            ...q,
            id: `q${i + 1}_${Date.now()}`,
          })),
          expiresAt,
        });
      } else {
        await createSurvey.mutateAsync({
          title,
          description,
          courseId,
          questions,
          createdBy: user?.uid || "unknown",
          expiresAt,
        });
      }
      router.back();
    } catch (error) {
      console.error("Error saving survey:", error);
    }
  };

  if (isEditing && surveyQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">Cargando encuesta...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle
        title={isEditing ? "Editar Encuesta" : "Nueva Encuesta"}
        subtitle={isEditing ? "Modifica la encuesta" : "Crea una nueva encuesta"}
      />

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Plantillas (solo al crear) */}
        {!isEditing && (
          <View className="mb-6">
            <TouchableOpacity
              className="bg-secondary rounded-xl py-3 px-4 flex-row items-center justify-between"
              onPress={() => setShowTemplates(!showTemplates)}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="document-text-outline" size={20} color="white" />
                <Text className="text-white font-semibold">
                  Usar plantilla rápida
                </Text>
              </View>
              <Ionicons
                name={showTemplates ? "chevron-up" : "chevron-down"}
                size={20}
                color="white"
              />
            </TouchableOpacity>

            {showTemplates && (
              <View className="mt-3 gap-2">
                <TouchableOpacity
                  className="bg-gray-900 rounded-xl p-3"
                  onPress={() => applyTemplate("satisfactionBasic")}
                >
                  <Text className="text-white font-semibold">
                    Satisfacción Básica
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    3 preguntas: rating, opción múltiple y texto
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-gray-900 rounded-xl p-3"
                  onPress={() => applyTemplate("instructorEvaluation")}
                >
                  <Text className="text-white font-semibold">
                    Evaluación del Instructor
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    4 preguntas enfocadas en el profesor
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-gray-900 rounded-xl p-3"
                  onPress={() => applyTemplate("courseContent")}
                >
                  <Text className="text-white font-semibold">
                    Evaluación del Contenido
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    3 preguntas sobre el material del curso
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Título */}
        <Text className="text-white font-semibold mb-2">Título *</Text>
        <TextInput
          className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
          value={title}
          onChangeText={setTitle}
          placeholder="Ej: Encuesta de Satisfacción - Salsa Inicial"
          placeholderTextColor="#9CA3AF"
        />

        {/* Descripción */}
        <Text className="text-white font-semibold mb-2">Descripción</Text>
        <TextInput
          className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe brevemente el propósito de la encuesta"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
        />

        {/* Curso */}
        <Text className="text-white font-semibold mb-2">Curso *</Text>
        <DataLoader query={coursesQuery} emptyMessage="No hay cursos disponibles">
          {(courses) => (
            <View className="bg-gray-900 rounded-xl mb-4">
              <Picker
                selectedValue={courseId}
                onValueChange={(value) => setCourseId(String(value))}
                dropdownIconColor="#ffffff"
                style={{ color: "white" }}
                enabled={!isEditing}
              >
                <Picker.Item label="Selecciona un curso" value="" />
                {courses.map((course) => (
                  <Picker.Item
                    key={course.id}
                    label={course.title}
                    value={course.id}
                  />
                ))}
              </Picker>
            </View>
          )}
        </DataLoader>

        {/* Preguntas */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-semibold text-lg">
              Preguntas ({questions.length})
            </Text>
          </View>

          {questions.map((question, index) => (
            <View key={index} className="bg-gray-900 rounded-xl p-4 mb-3">
              {/* Header pregunta */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-primary font-semibold">
                  Pregunta {index + 1}
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={() => moveQuestion(index, "up")}>
                    <Ionicons name="arrow-up" size={20} color="#40E0D0" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveQuestion(index, "down")}>
                    <Ionicons name="arrow-down" size={20} color="#40E0D0" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteQuestion(index)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tipo de pregunta */}
              <View className="bg-gray-800 rounded-xl mb-3">
                <Picker
                  selectedValue={question.questionType}
                  onValueChange={(value) =>
                    updateQuestion(index, {
                      questionType: value as QuestionType,
                      ...(value === "multiple_choice"
                        ? { options: ["", ""] }
                        : {}),
                    })
                  }
                  dropdownIconColor="#ffffff"
                  style={{ color: "white" }}
                >
                  <Picker.Item label="Escala (1-5)" value="rating" />
                  <Picker.Item
                    label="Opción Múltiple"
                    value="multiple_choice"
                  />
                  <Picker.Item label="Texto Libre" value="text" />
                </Picker>
              </View>

              {/* Texto pregunta */}
              <TextInput
                className="bg-gray-800 text-white rounded-xl px-3 py-2 mb-3"
                value={question.questionText}
                onChangeText={(text) =>
                  updateQuestion(index, { questionText: text })
                }
                placeholder="Escribe la pregunta"
                placeholderTextColor="#9CA3AF"
                multiline
              />

              {/* Opciones para multiple choice */}
              {question.questionType === "multiple_choice" && (
                <View className="mb-3">
                  <Text className="text-gray-400 text-sm mb-2">Opciones:</Text>
                  {question.options?.map((option, optIndex) => (
                    <View
                      key={optIndex}
                      className="flex-row items-center mb-2 gap-2"
                    >
                      <TextInput
                        className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2"
                        value={option}
                        onChangeText={(text) =>
                          updateOption(index, optIndex, text)
                        }
                        placeholder={`Opción ${optIndex + 1}`}
                        placeholderTextColor="#9CA3AF"
                      />
                      {question.options!.length > 2 && (
                        <TouchableOpacity
                          onPress={() => deleteOption(index, optIndex)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color="#ef4444"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity
                    className="bg-gray-800 rounded-xl py-2 items-center"
                    onPress={() => addOption(index)}
                  >
                    <Text className="text-primary">+ Agregar opción</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Requerida */}
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-400">Pregunta obligatoria</Text>
                <Switch
                  value={question.required}
                  onValueChange={(value) =>
                    updateQuestion(index, { required: value })
                  }
                  trackColor={{ false: "#374151", true: "#40E0D0" }}
                  thumbColor={question.required ? "#ffffff" : "#9CA3AF"}
                />
              </View>
            </View>
          ))}

          {/* Botones agregar pregunta */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 bg-gray-800 rounded-xl py-3 items-center flex-row justify-center gap-2"
              onPress={() => addQuestion("rating")}
            >
              <Ionicons name="star-outline" size={18} color="white" />
              <Text className="text-white">Rating</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-gray-800 rounded-xl py-3 items-center flex-row justify-center gap-2"
              onPress={() => addQuestion("multiple_choice")}
            >
              <Ionicons name="list-outline" size={18} color="white" />
              <Text className="text-white">Múltiple</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-gray-800 rounded-xl py-3 items-center flex-row justify-center gap-2"
              onPress={() => addQuestion("text")}
            >
              <Ionicons name="create-outline" size={18} color="white" />
              <Text className="text-white">Texto</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Guardar */}
        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 items-center mb-4"
          onPress={handleSave}
          disabled={createSurvey.isPending || updateSurvey.isPending}
        >
          <Text className="text-black font-bold text-base">
            {createSurvey.isPending || updateSurvey.isPending
              ? "Guardando..."
              : isEditing
              ? "Actualizar Encuesta"
              : "Crear Encuesta"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-gray-800 rounded-2xl py-3 items-center"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
