import { useSignOut } from "@/hooks/auth/useSignOut";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Notifications } from "@/lib/notifications";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";

// Notifications is null in Expo Go on Android (see lib/notifications.ts).
const useLastNotificationResponse =
  Notifications?.useLastNotificationResponse ?? (() => undefined);

/** The app's top navigation: signed-out or signed-in screens, by the active user. */
const AppContent = () => {
  const { user } = useActiveUser();
  const router = useRouter();
  const lastNotificationResponse = useLastNotificationResponse();
  const { mutate: signOut } = useSignOut();
  const isActiveUser = !!user && user.isActive;

  // A deactivated account can't use the app (the database already refuses its
  // requests): tell the user and sign them out.
  useEffect(() => {
    if (user && !user.isActive) {
      Alert.alert(
        "Cuenta desactivada",
        "Tu cuenta está desactivada. Contacta a la academia para más información.",
      );
      signOut();
    }
  }, [user, signOut]);

  // Tapping an attendance reminder opens the RSVP screen for that class.
  useEffect(() => {
    const data = lastNotificationResponse?.notification.request.content.data;
    if (
      data?.type === "attendance_rsvp" &&
      typeof data.courseId === "string" &&
      typeof data.classId === "string"
    ) {
      router.push({
        pathname: "/private/user/attendance/rsvp",
        params: {
          courseId: data.courseId,
          classId: data.classId,
          courseTitle:
            typeof data.courseTitle === "string" ? data.courseTitle : "",
        },
      });
    }
  }, [lastNotificationResponse, router]);

  return (
    <Stack>
      <Stack.Protected guard={!isActiveUser}>
        <Stack.Screen name="public" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isActiveUser}>
        <Stack.Screen name="private" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
};

export default AppContent;
