import ClassForm from "@/components/courses/ClassForm";
import DataLoader from "@/components/DataLoader";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { parseLocalDate, timeToDate } from "@/constants/helpers";
import { useGetClassInfo } from "@/hooks/classes/useGetClassInfo";
import { useUpdateClass } from "@/hooks/classes/useUpdateClass";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, View } from "react-native";

const EditClassScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const classQuery = useGetClassInfo(id);
  const updateClass = useUpdateClass();

  const confirmDelete = (title: string) =>
    Alert.alert("Eliminar clase", `¿Estás seguro de eliminar "${title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          updateClass.mutate({ id, patch: { isDeleted: true } }, { onSuccess: () => router.back() }),
      },
    ]);

  // The form takes its starting values once, so it waits for the class.
  if (!classQuery.data) {
    return (
      <Screen scroll={false}>
        <ScreenHeader nav="close" eyebrow="Clases" title="Editar clase" />
        <View className="flex-1">
          <DataLoader query={classQuery} emptyMessage="No encontramos esta clase.">
            {() => null}
          </DataLoader>
        </View>
      </Screen>
    );
  }

  const cls = classQuery.data;
  return (
    <ClassForm
      heading="Editar clase"
      initial={{
        courseId: cls.courseId,
        title: cls.title ?? "",
        description: cls.description ?? "",
        objectives: cls.objectives ?? "",
        content: cls.content ?? "",
        date: parseLocalDate(cls.date),
        startTime: cls.startTime ? timeToDate(cls.startTime) : null,
        endTime: cls.endTime ? timeToDate(cls.endTime) : null,
        videos: (cls.videoLinks ?? []).map((video) => ({
          url: video.url,
          platform: video.platform === "vimeo" ? "vimeo" : "youtube",
          title: video.title ?? null,
        })),
        isHidden: cls.isHidden,
      }}
      saveLabel="Guardar cambios"
      saving={updateClass.isPending}
      // Empty optional fields are stored as "no value" by useUpdateClass.
      onSave={({ courseId: _courseId, videos, ...values }) =>
        updateClass.mutate({ id, patch: { ...values, videoLinks: videos } }, { onSuccess: () => router.back() })
      }
      onDelete={() => confirmDelete(cls.title || "esta clase")}
    />
  );
};

export default EditClassScreen;
