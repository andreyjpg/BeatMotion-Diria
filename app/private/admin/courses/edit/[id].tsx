import CourseForm from "@/components/courses/CourseForm";
import DataLoader from "@/components/DataLoader";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatYYYYMMDD } from "@/constants/helpers";
import { useCourseById } from "@/hooks/courses/useCourseById";
import { useUpdateCourse } from "@/hooks/courses/useUpdateCourse";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, View } from "react-native";

export default function EditCourseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseQuery = useCourseById(id);
  const updateCourse = useUpdateCourse();

  const confirmDelete = (title: string) =>
    Alert.alert("Eliminar curso", `¿Estás seguro de eliminar "${title}"? Esto también eliminará todas sus clases.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          updateCourse.mutate(
            { id, patch: { isDeleted: true } },
            { onSuccess: () => router.dismissTo("/private/courses") },
          ),
      },
    ]);

  // The form takes its starting values once, so it waits for the course.
  if (!courseQuery.data) {
    return (
      <Screen scroll={false}>
        <ScreenHeader nav="close" eyebrow="Cursos" title="Editar curso" />
        <View className="flex-1">
          <DataLoader query={courseQuery} emptyMessage="No encontramos este curso.">
            {() => null}
          </DataLoader>
        </View>
      </Screen>
    );
  }

  const course = courseQuery.data;
  return (
    <CourseForm
      heading="Editar curso"
      initial={{
        title: course.title,
        description: course.description,
        level: course.level,
        day: course.day ?? "lunes",
        teacherId: course.teacherId ?? "",
        branchId: course.branchId ?? "",
        startDate: course.startDate,
      }}
      saveLabel="Guardar cambios"
      saving={updateCourse.isPending}
      onSave={({ startDate, branchId, ...values }) =>
        updateCourse.mutate(
          {
            id,
            patch: {
              ...values,
              branchId: branchId || null,
              startDate: startDate ? formatYYYYMMDD(startDate) : null,
            },
          },
          { onSuccess: () => router.back() },
        )
      }
      onDelete={() => confirmDelete(course.title)}
    />
  );
}
