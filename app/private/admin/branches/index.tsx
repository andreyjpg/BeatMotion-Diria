import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import { BranchType } from "@/hooks/branches/schema";
import { useBranches } from "@/hooks/branches/useBranches";
import { useDeleteBranch } from "@/hooks/branches/useDeleteBranch";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BranchesListScreen() {
  const router = useRouter();
  const branchesQuery = useBranches();
  const deleteBranch = useDeleteBranch();

  const handleDelete = (branch: BranchType) => {
    Alert.alert(
      "Eliminar sucursal",
      `¿Estás seguro de eliminar "${branch.name}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteBranch.mutate(branch.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle
        title="Sucursales"
        subtitle="Gestiona las sucursales de la academia"
      />

      <DataLoader
        query={branchesQuery}
        emptyMessage="No hay sucursales creadas aún."
      >
        {(branches, isRefetching, refetch) => (
          <FlatList
            data={branches}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#40E0D0"
              />
            }
            renderItem={({ item: branch }) => (
              <View className="bg-gray-900 rounded-3xl p-4 mb-4">
                <Text className="text-white text-lg font-bold">
                  {branch.name}
                </Text>
                <Text className="text-gray-400 text-sm mt-1">
                  {branch.location}
                </Text>

                <View className="flex-row gap-2 mt-4">
                  <TouchableOpacity
                    className="flex-1 bg-primary rounded-xl py-2 items-center flex-row justify-center gap-1"
                    onPress={() =>
                      router.push(
                        `/private/admin/branches/${branch.id}` as Href,
                      )
                    }
                  >
                    <Ionicons name="create-outline" size={16} color="black" />
                    <Text className="text-black font-semibold text-sm">
                      Editar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="w-10 h-10 bg-red-600 rounded-xl items-center justify-center"
                    onPress={() => handleDelete(branch)}
                  >
                    <Ionicons name="trash-outline" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </DataLoader>

      <TouchableOpacity
        className="absolute bottom-8 right-8 w-16 h-16 bg-primary rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push("/private/admin/branches/new" as Href)}
        style={{
          shadowColor: "#40E0D0",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={32} color="black" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
