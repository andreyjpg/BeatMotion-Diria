import { useCreateFCMToken } from "@/hooks/notifications/useCreateFCMToken";
import { useMyNotifications } from "@/hooks/notifications/useMyNotifications";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HomeAdmin from "./admin/homeAdmin";
import HomeTeacher from "./teacher/homeTeacher";
import HomeUser from "./user/HomeUser";

export default function HomeScreen() {
  const { user } = useActiveUser();
  const myNotifications = useMyNotifications();

  useCreateFCMToken();

  const goToProfile = () => {
    router.push("/private/profile");
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 bg-black ">
        {user?.role === "user" && <HomeUser />}
        {user?.role === "admin" && <HomeAdmin />}
        {user?.role === "teacher" && <HomeTeacher />}

        {/* Bottom bar */}
        <View className="absolute left-0 right-0 bottom-0 bg-gray-900 h-24 flex-row items-center px-6 gap-6">
          {user?.role !== "admin" && (
            <View className="flex-1 items-center">
              <TouchableOpacity
                onPress={() =>
                  router.push("/private/user/notifications/myNotifications")
                }
                className="w-12 h-12 rounded-full bg-white items-center justify-center relative "
                accessibilityLabel="Gestión de usuarios"
              >
                <Ionicons name="notifications" size={24} color="black" />
                {myNotifications.data?.some((noti) => !noti.read) && (
                  <Text className="w-2 h-2 rounded-xl bg-red-500 absolute z-10 top-2 right-3"></Text>
                )}
              </TouchableOpacity>
              <Text className="text-xs text-white mt-2">Notificaciones</Text>
            </View>
          )}

          <View className="flex-1 items-center">
            <TouchableOpacity
              onPress={goToProfile}
              className="w-12 h-12 rounded-full bg-white items-center justify-center"
              accessibilityLabel="Ir a mi perfil"
            >
              <Ionicons name="person-circle-outline" size={26} />
            </TouchableOpacity>
            <Text className="text-xs text-white mt-2">Ver Perfil</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
