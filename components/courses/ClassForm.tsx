import HiddenSwitchCard from "@/components/courses/HiddenSwitchCard";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DateTimeField from "@/components/ui/DateTimeField";
import Field from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SelectField from "@/components/ui/SelectField";
import { detectVideoPlatform, formatYYYYMMDD, timeToDate, to24h } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { classFormSchema, FormErrors, validationErrors, videoLinkFormSchema } from "@/constants/validationForms";
import { useClassesByCourseId } from "@/hooks/classes/useClassesByCourseId";
import { useCourses } from "@/hooks/courses/useCourses";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

type Video = { url: string; platform: "youtube" | "vimeo"; title: string | null };

/** A course's "HH:MM" time for a time picker; null when the course has none. */
const courseTime = (value: string | null | undefined) => (value ? timeToDate(value) : null);

export type ClassFormValues = {
  courseId: string;
  title: string;
  description: string;
  objectives: string;
  content: string;
  date: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  videos: Video[];
  /** Hidden from students. */
  isHidden: boolean;
};

/** What the hooks save: the date and times as Postgres takes them. */
export type ClassFormOutput = Omit<ClassFormValues, "date" | "startTime" | "endTime"> & {
  date: string;
  startTime: string;
  endTime: string;
};

type ClassFormProps = {
  heading: string;
  /** The class being edited; without it the form creates a new one. */
  initial?: ClassFormValues;
  /** New classes: the course they were opened from. */
  preselectedCourseId?: string;
  saveLabel: string;
  /** Save button while the class is set to hidden; saveLabel without it. */
  hiddenSaveLabel?: string;
  saving: boolean;
  onSave: (values: ClassFormOutput) => void;
  /** Editing only: asks for confirmation first, on the screen. */
  onDelete?: () => void;
};

/** The class form, for creating and for editing. Admins only. */
const ClassForm = ({
  heading,
  initial,
  preselectedCourseId,
  saveLabel,
  hiddenSaveLabel,
  saving,
  onSave,
  onDelete,
}: ClassFormProps) => {
  const router = useRouter();
  const coursesQuery = useCourses();
  const courses = coursesQuery.data ?? [];

  const [chosenCourseId, setCourseId] = useState(initial?.courseId ?? preselectedCourseId ?? "");
  // Null until typed: a new class suggests "Clase N" for its course.
  const [typedTitle, setTitle] = useState<string | null>(initial?.title ?? null);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [objectives, setObjectives] = useState(initial?.objectives ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [date, setDate] = useState<Date | null>(initial?.date ?? null);
  // Undefined until picked or cleared: a new class takes its course's hours.
  const [pickedStartTime, setStartTime] = useState<Date | null | undefined>(initial ? initial.startTime : undefined);
  const [pickedEndTime, setEndTime] = useState<Date | null | undefined>(initial ? initial.endTime : undefined);
  const [videos, setVideos] = useState<Video[]>(initial?.videos ?? []);
  // New classes start visible, as the database defaults them.
  const [isHidden, setIsHidden] = useState(initial?.isHidden ?? false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors<typeof classFormSchema>>({});
  const [videoErrors, setVideoErrors] = useState<FormErrors<typeof videoLinkFormSchema>>({});

  const courseId = chosenCourseId || (courses[0]?.id ?? "");
  const classesQuery = useClassesByCourseId(initial ? "" : courseId);
  const suggestedTitle = classesQuery.data ? `Clase ${classesQuery.data.length + 1}` : "";
  const title = typedTitle ?? suggestedTitle;

  const course = courses.find((c) => c.id === courseId);
  const startTime = pickedStartTime === undefined ? courseTime(course?.startTime) : pickedStartTime;
  const endTime = pickedEndTime === undefined ? courseTime(course?.endTime) : pickedEndTime;
  const showsCourseTimes =
    pickedStartTime === undefined && pickedEndTime === undefined && (startTime !== null || endTime !== null);

  const addVideo = () => {
    const found = validationErrors(videoLinkFormSchema, { url: videoUrl });
    setVideoErrors(found);
    const url = videoUrl.trim();
    const platform = detectVideoPlatform(url);
    if (Object.keys(found).length > 0 || !platform) return;
    setVideos([...videos, { url, platform, title: videoTitle.trim() || null }]);
    setVideoTitle("");
    setVideoUrl("");
  };

  const save = () => {
    const values = {
      courseId,
      title: title.trim(),
      description: description.trim(),
      objectives: objectives.trim(),
      content: content.trim(),
      date: date ? formatYYYYMMDD(date) : "",
      startTime: startTime ? to24h(startTime) : "",
      endTime: endTime ? to24h(endTime) : "",
      videos,
      isHidden,
    };
    const found = validationErrors(classFormSchema, values);
    setErrors(found);
    if (Object.keys(found).length === 0) onSave(values);
  };

  if (coursesQuery.isSuccess && courses.length === 0) {
    return (
      <Screen>
        <ScreenHeader nav="close" eyebrow="Clases" title={heading} />
        <AppText tone="muted" className="px-5 pt-4 text-[14.5px] leading-[20px]">
          Todavía no hay cursos. Crea un curso antes de crear una clase.
        </AppText>
        <Button
          label="Crear curso"
          icon="add"
          onPress={() => router.replace("/private/admin/courses/new")}
          className="mx-3 mt-4"
        />
      </Screen>
    );
  }

  return (
    <Screen
      form
      footer={
        <FormActions
          saveLabel={isHidden && hiddenSaveLabel ? hiddenSaveLabel : saveLabel}
          onSave={save}
          loading={saving}
          hasErrors={Object.keys(errors).length > 0}
        />
      }
    >
      <ScreenHeader nav="close" eyebrow="Clases" title={heading} subtitle="Los campos con * son obligatorios." />

      <HiddenSwitchCard isHidden={isHidden} onChange={setIsHidden} />

      <Card className="mx-3 mt-2.5 gap-3.5">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Clase
        </AppText>
        {/* A class stays in its course: only new ones choose it. */}
        {!initial && (
          <SelectField
            label="Curso *"
            value={courseId}
            onChange={(value) => {
              setCourseId(value);
              setErrors({});
            }}
            options={courses.map((c) => ({ value: c.id, label: c.title }))}
            placeholder={coursesQuery.isLoading ? "Cargando cursos…" : "Selecciona un curso"}
            error={errors.courseId}
          />
        )}
        <Field label="Título *" value={title} onChangeText={setTitle} placeholder="Clase 1" error={errors.title} />
        <DateTimeField label="Fecha" mode="date" value={date} onChange={setDate} onClear={() => setDate(null)} />
        <View>
          <View className="flex-row gap-2.5">
            <DateTimeField
              label="Hora de inicio"
              mode="time"
              value={startTime}
              onChange={setStartTime}
              onClear={() => setStartTime(null)}
              className="flex-1"
            />
            <DateTimeField
              label="Hora de fin"
              mode="time"
              value={endTime}
              onChange={setEndTime}
              onClear={() => setEndTime(null)}
              error={errors.endTime}
              className="flex-1"
            />
          </View>
          {showsCourseTimes && !errors.endTime && (
            <AppText tone="muted" className="mt-1.5 text-[12.5px] leading-[17px]">
              Tomadas del horario del curso. Puedes cambiarlas.
            </AppText>
          )}
        </View>
      </Card>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Contenido
        </AppText>
        <Field
          label="Descripción breve"
          value={description}
          onChangeText={setDescription}
          placeholder="Resume en pocas palabras de qué trata esta clase"
          multiline
        />
        <Field
          label="Objetivos"
          value={objectives}
          onChangeText={setObjectives}
          placeholder="¿Qué aprenderán los estudiantes en esta clase?"
          hint="Escribe un objetivo por línea."
          multiline
        />
        <Field
          label="Contenido *"
          value={content}
          onChangeText={setContent}
          placeholder="Escribe aquí todo el contenido que quieres compartir con los estudiantes…"
          multiline
          error={errors.content}
        />
      </Card>

      <Card className="mx-3 mt-2.5 gap-3">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Videos
        </AppText>
        {videos.map((video, index) => (
          <View key={`${index}-${video.url}`} className="flex-row items-center gap-3 rounded-xl bg-field px-3 py-2.5">
            <View className="h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-ink">
              <Ionicons name="play" size={14} color={palette.surface} />
            </View>
            <View className="flex-1">
              <AppText variant="bold" className="text-[14.5px]" numberOfLines={1}>
                {video.title || (video.platform === "youtube" ? "Video de YouTube" : "Video de Vimeo")}
              </AppText>
              <AppText tone="muted" className="text-[12px]" numberOfLines={1}>
                {video.url}
              </AppText>
            </View>
            <IconButton
              icon="close"
              size={36}
              onPress={() => setVideos(videos.filter((_, i) => i !== index))}
              accessibilityLabel="Quitar video"
            />
          </View>
        ))}
        <Field label="Título del video" value={videoTitle} onChangeText={setVideoTitle} placeholder="Opcional" />
        <Field
          label="Enlace"
          value={videoUrl}
          onChangeText={setVideoUrl}
          placeholder="https://youtube.com/… o https://vimeo.com/…"
          autoCapitalize="none"
          keyboardType="url"
          error={videoErrors.url}
        />
        <Button label="Agregar video" variant="secondary" size="sm" icon="add" onPress={addVideo} />
      </Card>

      {onDelete && (
        <Button label="Eliminar clase" variant="danger" icon="trash-outline" onPress={onDelete} className="mx-3 mt-4" />
      )}
    </Screen>
  );
};

export default ClassForm;
