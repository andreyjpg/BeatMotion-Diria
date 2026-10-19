import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Redirect, Stack } from "expo-router";
import { Text, View } from "react-native";

// Admins and teachers only. This only hides screens: what each role may
// actually read or change is enforced by the database's access rules.
export default function AdminLayout() {
  const { user, isLoading } = useActiveUser();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Cargando acceso...</Text>
      </View>
    );
  }
  if (!user) return <Redirect href="/public/login" />;
  if (user.role !== "admin" && user.role !== "teacher") return <Redirect href="/private/home" />;

  return (
    <Stack initialRouteName="coursesMenu">
      {/* Menú principal sin colisiones */}
      <Stack.Screen
        name="users"
        options={{ title: "Users", headerShown: false }}
      />
      <Stack.Screen
        name="user/[uid]"
        options={{ title: "Users", headerShown: false }}
      />
      <Stack.Screen
        name="coursesMenu"
        options={{ title: "Cursos", headerShown: false }}
      />

      {/* Cursos */}
      <Stack.Screen
        name="courses/list"
        options={{ title: "Ver cursos", headerShown: false }}
      />
      <Stack.Screen
        name="courses/new"
        options={{ title: "Nuevo curso", headerShown: false }}
      />
      <Stack.Screen
        name="courses/[id]"
        options={{ title: "Editar curso", headerShown: false }}
      />

      {/* Eventos */}
      <Stack.Screen
        name="events/index"
        options={{ title: "Eventos", headerShown: false }}
      />
      <Stack.Screen
        name="events/new"
        options={{ title: "Nuevo evento", headerShown: false }}
      />
      <Stack.Screen
        name="events/[id]"
        options={{ title: "Editar evento", headerShown: false }}
      />

      {/* Clases */}
      <Stack.Screen
        name="classes/list"
        options={{ title: "Ver clases", headerShown: false }}
      />
      <Stack.Screen
        name="classes/new"
        options={{ title: "Nueva clase", headerShown: false }}
      />
      <Stack.Screen
        name="classes/[id]"
        options={{ title: "Editar clase", headerShown: false }}
      />
      <Stack.Screen
        name="attendance/[courseId]/[classId]/attendance"
        options={{ headerShown: false }}
      />

      {/* Matriculas */}
      <Stack.Screen
        name="enrollments/enrollmentList"
        options={{ headerShown: false }}
      />

      {/* notification Center */}
      <Stack.Screen
        name="notifications/notificationCenter"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="notifications/[draftId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="notifications/notificationsHistory"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="surveys/list"
        options={{
          headerShown: false,
          title: "Gestión de Encuestas",
        }}
      />
      {/* Encuestas*/}
      {/* Encuestas*/}
      <Stack.Screen
        name="surveys/create"
        options={{
          headerShown: false,
          title: "Nueva Encuesta",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="surveys/results/[surveyId]"
        options={{
          headerShown: false,
          title: "Resultados de Encuesta",
        }}
      />
      <Stack.Screen
        name="payment/paymentCenter"
        options={{ headerShown: false }}
      />

      {/* Reports */}
      <Stack.Screen
        name="reports/index"
        options={{ title: "Reportes", headerShown: false }}
      />

      {/* Branches */}
      <Stack.Screen
        name="branches/index"
        options={{ title: "Sucursales", headerShown: false }}
      />
      <Stack.Screen
        name="branches/new"
        options={{ title: "Nueva sucursal", headerShown: false }}
      />
      <Stack.Screen
        name="branches/[id]"
        options={{ title: "Editar sucursal", headerShown: false }}
      />
    </Stack>
  );
}
