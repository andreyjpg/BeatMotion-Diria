import { useSignOut } from "@/hooks/auth/useSignOut";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Notifications } from "@/lib/notifications";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
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

  // A membership change push (BM-033..035) opens Mi membresía for the student,
  // and the student's profile for an admin. The role may load after the push
  // is tapped, so each push is followed once, when the role is known.
  const role = user?.role;
  const handledMembershipPushId = useRef<string | null>(null);
  useEffect(() => {
    const request = lastNotificationResponse?.notification.request;
    const data = request?.content.data;
    if (!request || data?.type !== "membership_change" || !role) return;
    if (handledMembershipPushId.current === request.identifier) return;
    handledMembershipPushId.current = request.identifier;
    if (role === "admin" && typeof data.userId === "string") {
      router.push({ pathname: "/private/admin/user/[uid]", params: { uid: data.userId } });
    } else if (role === "user") {
      router.push("/private/user/membership");
    }
  }, [lastNotificationResponse, router, role]);

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
