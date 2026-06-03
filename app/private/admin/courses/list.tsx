import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCourses } from "@/hooks/courses/useCourses";
import { useUpdateCourse } from "@/hooks/courses/useUpdateCourse";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CoursesListScreen() {
  const updateCourseMutation = useUpdateCourse();
  const courseQuery = useCourses();
  const branchesQuery = useBranches();

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar", "¿Seguro que quieres eliminar este curso?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          updateCourseMutation.mutate({ id, patch: { isDeleted: true } });
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-black px-6 py-10">
      <HeaderTitle title="Ver Cursos" />

      <DataLoader
        query={courseQuery}
        emptyMessage="En este momento, no existen cursos creados"
      >
        {(data) => (
          <FlatList
            data={data}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => {
              const branch = branchesQuery.data?.find(
                (b) => b.id === item.branchId
              );
              return (
              <View className="bg-gray-900 rounded-2xl px-4 py-3 mb-3 flex-row items-center">
                <View className="flex-1">
                  <Text className="text-white font-semibold">{item.title}</Text>
                  <Text className="text-gray-400">
                    {item.teacher} · {item.level}
                  </Text>
                  {branch && (
                    <View className="flex-row items-center gap-1 mt-1">
                      <Ionicons
                        name="business-outline"
                        size={12}
                        color="turquoise"
                      />
                      <Text className="text-primary text-xs">{branch.name}</Text>
                    </View>
                  )}
                </View>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="bg-white rounded-xl px-4 py-2"
                    onPress={() =>
                      router.push({
                        pathname: "/private/admin/courses/[id]",
                        params: { id: String(item.id) },
                      } as Href)
                    }
                  >
                    <Text className="font-semibold">Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-red-500 rounded-xl px-4 py-2"
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text className="text-white font-semibold">Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
              );
            }}
          />
        )}
      </DataLoader>
    </SafeAreaView>
  );
}
