import DataLoader from "@/components/DataLoader";
import { useClassesByCourseId } from "@/hooks/classes/useClassesByCourseId";
import { useUpdateClass } from "@/hooks/classes/useUpdateClass";
import { useCourses } from "@/hooks/courses/useCourses";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ClassesBrowserScreen() {
  const coursesQuery = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  // Until the user picks one, show the first (most recent) course.
  const activeCourseId = selectedCourseId ?? coursesQuery.data?.[0]?.id ?? "";
  const classesQuery = useClassesByCourseId(activeCourseId);
  const updateClassMutation = useUpdateClass();

  const handleDeleteClass = (id: string) => {
    Alert.alert("Eliminar", "¿Seguro que quieres eliminar esta clase?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          updateClassMutation.mutate({ id, patch: { isDeleted: true } });
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-black px-6 py-10">
      <Text className="text-white text-2xl font-bold mb-6">Ver clases</Text>

      <DataLoader
        query={coursesQuery}
        emptyMessage="No hay cursos. Crea un curso para ver sus clases."
      >
        {(courses) => (
          <>
            <Text className="text-white mb-2">Cursos:</Text>
            <FlatList
              horizontal
              data={courses}
              keyExtractor={(c) => c.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
              renderItem={({ item }) => {
                const active = item.id === activeCourseId;
                return (
                  <TouchableOpacity
                    className={`px-3 py-1 rounded-lg mr-2 border ${
                      active
                        ? "bg-white border-transparent"
                        : "bg-gray-800 border-gray-700"
                    }`}
                    onPress={() => setSelectedCourseId(item.id)}
                  >
                    <Text
                      className={
                        active
                          ? "font-semibold text-black text-xs"
                          : "text-white text-xs"
                      }
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <Text className="text-white mt-6 mb-2">
              Clases del curso seleccionado:
            </Text>
            <DataLoader
              query={classesQuery}
              emptyMessage="No hay clases para este curso."
            >
              {(classes, isRefetching, refetch) => (
                <FlatList
                  // Most recent first.
                  data={[...classes].reverse()}
                  keyExtractor={(it) => it.id}
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  renderItem={({ item }) => (
                    <View className="bg-gray-900 rounded-2xl px-3 py-2 mb-2">
                      <Text className="text-white font-semibold">
                        {item.title ?? `Clase ${item.date ?? ""}`}
                      </Text>
                      <Text className="text-gray-400">
                        {item.date ?? "—"} {item.startTime ?? ""}
                        {item.endTime ? `-${item.endTime}` : ""}
                      </Text>

                      <View className="flex-row gap-2 mt-2">
                        <TouchableOpacity
                          className="bg-white rounded-xl px-3 py-2"
                          onPress={() =>
                            router.push(`/private/admin/classes/${item.id}`)
                          }
                        >
                          <Text className="font-semibold">Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="bg-red-500 rounded-xl px-3 py-2"
                          onPress={() => handleDeleteClass(item.id)}
                        >
                          <Text className="text-white font-semibold">
                            Eliminar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              )}
            </DataLoader>
          </>
        )}
      </DataLoader>

      <TouchableOpacity
        className="bg-gray-800 rounded-2xl px-5 py-3 mt-6"
        onPress={() => router.replace("/private/admin/coursesMenu")}
      >
        <Text className="text-center text-white font-semibold">Volver</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
