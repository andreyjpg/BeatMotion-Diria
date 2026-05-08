import HeaderTitle from "@/components/headerTitle";
import { useBranchById } from "@/hooks/branches/useBranchById";
import { useUpdateBranch } from "@/hooks/branches/useUpdateBranch";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditBranchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const branchQuery = useBranchById(id);
  const updateBranch = useUpdateBranch();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (branchQuery.data) {
      setName(branchQuery.data.name);
      setLocation(branchQuery.data.location);
    }
  }, [branchQuery.data]);

  const handleSave = () => {
    if (!name.trim() || !location.trim()) return;
    updateBranch.mutate(
      { id, name: name.trim(), location: location.trim() },
      { onSuccess: () => router.back() },
    );
  };

  if (branchQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Cargando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle title="Editar sucursal" />
      <ScrollView showsVerticalScrollIndicator={false} className="px-6">
        <Text className="text-white mb-2 font-semibold">Nombre *</Text>
        <TextInput
          className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
          value={name}
          onChangeText={setName}
          placeholder="Nombre de la sucursal"
          placeholderTextColor="#9CA3AF"
        />

        <Text className="text-white mb-2 font-semibold">Ubicación *</Text>
        <TextInput
          className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-6"
          value={location}
          onChangeText={setLocation}
          placeholder="Dirección o descripción de la ubicación"
          placeholderTextColor="#9CA3AF"
          multiline
        />

        <TouchableOpacity
          className="bg-primary rounded-2xl px-5 py-4 active:opacity-80 mb-3"
          onPress={handleSave}
          disabled={updateBranch.isPending || !name.trim() || !location.trim()}
        >
          <Text className="text-center font-semibold">
            {updateBranch.isPending ? "Guardando..." : "Guardar cambios"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-gray-800 rounded-2xl px-5 py-3"
          onPress={() => router.back()}
        >
          <Text className="text-center text-white font-semibold">Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
