import DataLoader from "@/components/DataLoader";
import FormScrollView from "@/components/FormScrollView";
import HeaderTitle from "@/components/headerTitle";
import { capitalize } from "@/constants/helpers";
import { ProfileAdminValidationSchema } from "@/constants/validationForms";
import { useUpdateProfile } from "@/hooks/user/useUpdateProfile";
import { useUserInfo } from "@/hooks/user/useUserInfo";
import { Picker } from "@react-native-picker/picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Yup from "yup";

const USER_ROLES_MAPPER = {
  user: "Usuario",
  admin: "Administrador",
  teacher: "Profesor",
};

export default function AdminUserProfile() {
  const { uid } = useLocalSearchParams();
  const [editing, setEditing] = useState(false);
  const userQuery = useUserInfo(uid as string);
  const updateProfileMutation = useUpdateProfile();
  const [form, setForm] = useState({
    name: "",
    lastName: "",
    phone: "",
    role: "user",
    photoURL: "",
    email: "",
  });
  const [formErrors, setFormErrors] = useState({
    name: "",
    lastName: "",
    phone: "",
    role: "",
    email: "",
  });

  useEffect(() => {
    if (userQuery.data) {
      const userData = userQuery.data;
      setForm({
        name: userData.name || "",
        lastName: userData.lastName || "",
        phone: userData.phone || "",
        role: userData.role || "user",
        photoURL: userData.photoURL || "",
        email: userData.email || "",
      });
    }
  }, [userQuery.data]);

  const validation = () => {
    try {
      Yup.object(ProfileAdminValidationSchema).validateSync(form, {
        abortEarly: false,
      });
      setFormErrors({
        name: "",
        lastName: "",
        phone: "",
        role: "",
        email: "",
      });
    } catch (err: any) {
      const errors = {
        name: "",
        lastName: "",
        phone: "",
        role: "",
        email: "",
      };
      err.inner.reduce((acc: any, curr: any) => {
        acc[curr.path] = curr.message;
        return acc;
      }, errors);
      setFormErrors(errors);
      return false;
    }
    return true;
  };

  // Save updates
  const handleSave = async () => {
    if (validation()) {
      updateProfileMutation.mutate({
        uid: uid as string,
        body: {
          name: form.name.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          role: form.role,
        },
      });

      setEditing(false);
    }
  };

  return (
    <FormScrollView className="flex-1 bg-black px-6 py-10">
      <HeaderTitle title="Perfil de usuario" />

      <DataLoader query={userQuery}>
        {(data) => {
          return (
            <>
              {/* Avatar */}
              <View className="items-center mb-8">
                {form.photoURL ? (
                  <Image
                    source={{ uri: form.photoURL }}
                    className="w-28 h-28 rounded-full mb-4"
                  />
                ) : (
                  <View className="w-28 h-28 rounded-full bg-gray-800 mb-4 items-center justify-center">
                    <Text className="text-white text-xl">
                      {capitalize(form.name !== "" ? form.name?.[0] : "?")}{" "}
                      {capitalize(
                        form.lastName !== "" ? form.lastName?.[0] : "?"
                      )}
                    </Text>
                  </View>
                )}
                <Text className="text-white text-xl font-semibold">
                  {`${form.name} ${form.lastName}`.trim() || "Sin nombre"}
                </Text>
                <Text className="text-gray-400">
                  {form?.email || "Sin correo"}
                </Text>
              </View>

              {/* User Info */}
              <View className="bg-gray-900 rounded-2xl p-4 mb-8">
                <Text className="text-white font-semibold mb-3">Datos</Text>

                {/* Nombre */}
                <View className="mb-3">
                  <Text className="text-gray-400 text-xs mb-1">Nombre</Text>
                  {editing ? (
                    <>
                      <TextInput
                        value={form.name}
                        onChangeText={(value) =>
                          setForm({ ...form, name: value })
                        }
                        className="bg-gray-800 text-white rounded-xl px-3 py-3"
                      />
                      {formErrors.name ? (
                        <Text className="text-red-500 text-xs mt-1">
                          {formErrors.name}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text className="text-white">{form.name || "—"}</Text>
                  )}
                </View>

                {/* Apellido */}
                <View className="mb-3">
                  <Text className="text-gray-400 text-xs mb-1">Apellido</Text>
                  {editing ? (
                    <>
                      <TextInput
                        value={form.lastName}
                        onChangeText={(value) =>
                          setForm({ ...form, lastName: value })
                        }
                        className="bg-gray-800 text-white rounded-xl px-3 py-3"
                      />
                      {formErrors.lastName ? (
                        <Text className="text-red-500 text-xs mt-1">
                          {formErrors.lastName}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text className="text-white">{form.lastName || "—"}</Text>
                  )}
                </View>

                {/* Teléfono */}
                <View className="mb-3">
                  <Text className="text-gray-400 text-xs mb-1">Teléfono</Text>
                  {editing ? (
                    <>
                      <TextInput
                        value={form.phone}
                        onChangeText={(value) =>
                          setForm({ ...form, phone: value })
                        }
                        keyboardType="phone-pad"
                        className="bg-gray-800 text-white rounded-xl px-3 py-3"
                      />
                      {formErrors.phone ? (
                        <Text className="text-red-500 text-xs mt-1">
                          {formErrors.phone}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text className="text-white">{form.phone || "—"}</Text>
                  )}
                </View>

                {/* Rol */}
                <View className="mb-3">
                  <Text className="text-gray-400 text-xs mb-1">Rol</Text>
                  {editing ? (
                    <>
                      <View className="bg-gray-800 rounded-xl">
                        <Picker
                          selectedValue={form.role}
                          onValueChange={(value: string) =>
                            setForm({ ...form, role: value })
                          }
                          dropdownIconColor="white"
                          style={{ color: "white" }}
                        >
                          <Picker.Item label="Usuario" value="user" />
                          <Picker.Item label="Administrador" value="admin" />
                          <Picker.Item label="Profesor" value="teacher" />
                        </Picker>
                      </View>
                      {formErrors.role ? (
                        <Text className="text-red-500 text-xs mt-1">
                          {formErrors.role}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text className="text-white capitalize">
                      {USER_ROLES_MAPPER[
                        form.role as keyof typeof USER_ROLES_MAPPER
                      ] || "—"}
                    </Text>
                  )}
                </View>
              </View>

              {/* Buttons */}
              <View className="gap-3">
                {editing ? (
                  <>
                    <TouchableOpacity
                      className="bg-white rounded-2xl px-5 py-4 active:opacity-80"
                      onPress={handleSave}
                    >
                      <Text className="text-center font-semibold">
                        Guardar cambios
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-gray-700 rounded-2xl px-5 py-4 active:opacity-80"
                      onPress={() => setEditing(false)}
                    >
                      <Text className="text-center font-semibold text-white">
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      className="bg-white rounded-2xl px-5 py-4 active:opacity-80"
                      onPress={() => setEditing(true)}
                    >
                      <Text className="text-center font-semibold">
                        Editar información
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-gray-700 rounded-2xl px-5 py-4 active:opacity-80"
                      onPress={() => router.back()}
                    >
                      <Text className="text-center font-semibold text-white">
                        Volver
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          );
        }}
      </DataLoader>
    </FormScrollView>
  );
}
