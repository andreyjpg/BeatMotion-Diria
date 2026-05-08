import { auth, firestore } from "@/firebaseConfig";
import { Stack, router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function AdminLayout() {
  const [allowed, setAllowed] = useState<null | boolean>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setAllowed(false);
        router.replace("/public/login");
        return;
      }
      const snap = await getDoc(doc(firestore, "users", u.uid));
      const role = snap.exists() ? (snap.data() as any).role : "user";
      const isAdmin = role === "admin" || role === "teacher";
      setAllowed(isAdmin);
      if (!isAdmin) router.replace("/private/home");
    });
    return () => unsub();
  }, []);

  if (allowed === null) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Cargando acceso...</Text>
      </View>
    );
  }

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
      <Stack.Screen
        name="user/dataUsersComparison"
        options={{
          title: "Estadisticas",
          headerShown: true,
          headerStyle: { backgroundColor: "#000" },
          headerTintColor: "#fff",
        }}
      />

      <Stack.Screen
        name="user/progress"
        options={{
          title: "Estudiante",
          headerShown: true,
          headerStyle: { backgroundColor: "#000" },
          headerTintColor: "#fff",
        }}
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
      <Stack.Screen
        name="user/surveys/list"
        options={{
          headerShown: false,
        }}
      />
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
        name="surveys/edit/[surveyId]"
        options={{
          headerShown: false,
          title: "Editar Encuesta",
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
