import FieldError from "@/components/FieldError";
import FormScrollView from "@/components/FormScrollView";
import HeaderTitle from "@/components/headerTitle";
import {
  branchFormSchema,
  FormErrors,
  validationErrors,
} from "@/constants/validationForms";
import { useCreateBranch } from "@/hooks/branches/useCreateBranch";
import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NewBranchScreen() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<FormErrors<typeof branchFormSchema>>({});
  const createBranch = useCreateBranch();

  const handleSave = () => {
    const formErrors = validationErrors(branchFormSchema, { name, location });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;
    createBranch.mutate(
      { name: name.trim(), location: location.trim() },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black ">
      <HeaderTitle title="Nueva sucursal" />
      <FormScrollView showsVerticalScrollIndicator={false} className="px-8">
        <Text className="text-white mb-2 font-semibold">Nombre *</Text>
        <TextInput
          className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
          value={name}
          onChangeText={setName}
          placeholder="Nombre de la sucursal"
          placeholderTextColor="#9CA3AF"
        />
        <FieldError message={errors.name} className="-mt-3 mb-4" />

        <Text className="text-white mb-2 font-semibold">Ubicación *</Text>
        <TextInput
          className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-6"
          value={location}
          onChangeText={setLocation}
          placeholder="Dirección o descripción de la ubicación"
          placeholderTextColor="#9CA3AF"
          multiline
        />
        <FieldError message={errors.location} className="-mt-5 mb-6" />

        <TouchableOpacity
          className="bg-primary rounded-2xl px-5 py-4 active:opacity-80 mb-3"
          onPress={handleSave}
          disabled={createBranch.isPending}
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
      </FormScrollView>
    </SafeAreaView>
  );
}
