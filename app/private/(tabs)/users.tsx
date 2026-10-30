import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import { formatDDMMYYYY, parseLocalDate } from "@/constants/helpers";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useSetUserActive } from "@/hooks/user/useSetUserActive";
import { useUsers } from "@/hooks/user/useUsers";
import type { PaymentStanding, UserListItem } from "@/hooks/user/userSchema";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ROLE_LABELS: Record<UserListItem["role"], string> = {
  user: "Estudiante",
  teacher: "Instructor",
  admin: "Administrador",
};

const PAYMENT_BADGES: Record<PaymentStanding, { label: string; className: string }> = {
  ok: { label: "Al día", className: "bg-green-900 text-green-300" },
  pending: { label: "Pago pendiente", className: "bg-yellow-900 text-yellow-300" },
  late: { label: "Atrasado", className: "bg-red-900 text-red-300" },
};

export default function AdminUsersScreen() {
  const { user } = useActiveUser();
  const router = useRouter();
  const usersQuery = useUsers();
  const setUserActive = useSetUserActive();

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

  const renderUser = ({ item }: { item: UserListItem }) => {
    const badge = item.paymentStatus ? PAYMENT_BADGES[item.paymentStatus] : null;
    const nextPayment = parseLocalDate(item.nextPaymentDate);

    return (
      <View className={`bg-gray-900 rounded-2xl p-4 mb-3 ${item.isActive ? "" : "opacity-60"}`}>
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text className="text-white font-semibold">
              {item.name} {item.lastName}
            </Text>
            <Text className="text-gray-400">{item.email}</Text>
            <Text className="text-gray-500 italic">
              {ROLE_LABELS[item.role]}
              {item.isActive ? "" : " · Inactivo"}
            </Text>
          </View>
          {badge && (
            <Text className={`px-2 py-1 rounded-full text-xs font-semibold overflow-hidden ${badge.className}`}>
              {badge.label}
            </Text>
          )}
        </View>

        {/* Courses and payment (students) */}
        {item.role === "user" && (
          <View className="mt-2 gap-1">
            {item.courses.length > 0 ? (
              <View className="flex-row flex-wrap gap-1">
                {item.courses.map((course) => (
                  <Text
                    key={course}
                    className="bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded-full overflow-hidden"
                  >
                    {course}
                  </Text>
                ))}
              </View>
            ) : (
              <Text className="text-gray-500 text-sm">Sin cursos activos</Text>
            )}
            {nextPayment && (
              <Text className="text-gray-400 text-xs">
                Próximo pago: {formatDDMMYYYY(nextPayment)}
              </Text>
            )}
          </View>
        )}

        <View className="flex-row mt-3 gap-3">
          <TouchableOpacity
            className="bg-blue-500 px-3 py-2 rounded-xl"
            onPress={() =>
              router.push({ pathname: "/private/admin/user/[uid]", params: { uid: item.id } })
            }
          >
            <Text className="text-white">Ver Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-yellow-500 px-3 py-2 rounded-xl"
            disabled={setUserActive.isPending}
            onPress={() => setUserActive.mutate({ userId: item.id, isActive: !item.isActive })}
          >
            <Text className="text-white">
              {item.isActive ? "Desactivar" : "Activar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle title="Gestión de usuarios" />
      <DataLoader
        query={usersQuery}
        emptyMessage="No hay usuarios registrados."
      >
        {(data, isRefetching, refetch) => (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            refreshing={isRefetching}
            onRefresh={refetch}
            contentContainerStyle={{ paddingHorizontal: 10 }}
          />
        )}
      </DataLoader>
    </SafeAreaView>
  );
}
