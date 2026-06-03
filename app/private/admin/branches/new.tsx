import HeaderTitle from "@/components/headerTitle";
import { useCreateBranch } from "@/hooks/branches/useCreateBranch";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NewBranchScreen() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const createBranch = useCreateBranch();

  const handleSave = () => {
    if (!name.trim() || !location.trim()) return;
    createBranch.mutate(
      { name: name.trim(), location: location.trim() },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black ">
      <HeaderTitle title="Nueva sucursal" />
      <ScrollView showsVerticalScrollIndicator={false} className="px-8">
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
          disabled={createBranch.isPending || !name.trim() || !location.trim()}
        >
          <Text className="text-center font-semibold">
            {createBranch.isPending ? "Guardando..." : "Guardar sucursal"}
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
