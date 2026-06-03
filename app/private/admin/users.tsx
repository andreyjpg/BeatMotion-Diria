import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import { firestore } from "@/firebaseConfig";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useUsers } from "@/hooks/user/useUsers";
import { useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminUsersScreen() {
  const { user } = useActiveUser();
  const router = useRouter();
  const usersQuery = useUsers();

  // Protect access
  useEffect(() => {
    if (user?.role !== "admin") {
      Alert.alert(
        "Acceso restringido",
        "Solo los administradores pueden ver esta sección",
      );
      router.replace("/private/home");
    }
  }, [user, router]);

  const handleDeactivate = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(firestore, "users", uid), {
        isActive: !currentStatus,
      });
      Alert.alert(
        "Éxito",
        `Usuario ${!currentStatus ? "activado" : "desactivado"}`,
      );
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // const renderComparisonButton = () => (
  //   <TouchableOpacity
  //     onPress={() => router.push("/private/admin/user/dataUsersComparison")}
  //     style={{
  //       flexDirection: "row",
  //       alignItems: "center",
  //       backgroundColor: "#1f2937",
  //       padding: 10,
  //       borderRadius: 12,
  //       marginBottom: 15,
  //     }}
  //   >
  //     <Icon name="bar-chart" size={22} color="white" />
  //     <Text className="text-white font-semibold ml-2">
  //       Estadisticas Estudiantes
  //     </Text>
  //   </TouchableOpacity>
  // );

  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const renderUser = ({ item }: any) => (
    <View className="bg-gray-900 rounded-2xl p-4 mb-3 relative">
      {/* {user?.role === "admin" && item.role === "user" && (
        <TouchableOpacity
          disabled={loadingUser === item.uid}
          onPress={async () => {
            if (loadingUser === item.uid) return; // seguridad extra

            try {
              setLoadingUser(item.uid);

              await getOrCreateUserProgress(item.uid);
              router.push(`/private/admin/user/progress?uid=${item.uid}`);
            } catch (error) {
              console.error("Error creando o recuperando progreso:", error);
              Alert.alert(
                "Error",
                "No se pudo acceder al progreso del usuario",
              );
            } finally {
              setLoadingUser(null);
            }
          }}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 10,
            padding: 6,
            opacity: loadingUser === item.uid ? 0.4 : 1,
          }}
        >
          <Icon name="analytics" size={28} color="white" />
        </TouchableOpacity>
      )} */}
      <Text className="text-white font-semibold">
        {item.name} {item.lastName}
      </Text>
      <Text className="text-gray-400">{item.email}</Text>
      <Text className="text-gray-500 italic">Rol: {item.role}</Text>
      <View className="flex-row mt-2 gap-3">
        <TouchableOpacity
          className="bg-blue-500 px-3 py-2 rounded-xl"
          onPress={() => router.push(`/private/admin/user/${item.uid}` as any)}
        >
          <Text className="text-white">Ver Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-yellow-500 px-3 py-2 rounded-xl"
          onPress={() => handleDeactivate(item.id, item.isActive)}
        >
          <Text className="text-white">
            {item.isActive ? "Desactivar" : "Activar"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle title="Gestión de usuarios" />
      {/* {renderComparisonButton()} */}
      <DataLoader
        query={usersQuery}
        emptyMessage="No hay usuarios registrados."
      >
        {(data) => (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            contentContainerStyle={{ paddingHorizontal: 10 }}
          />
        )}
      </DataLoader>
    </SafeAreaView>
  );
}
