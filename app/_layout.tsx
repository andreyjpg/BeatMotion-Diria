// app/_layout.tsx
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: process.env.EXPO_PUBLIC_APP_ENV !== "production",
  environment: process.env.EXPO_PUBLIC_APP_ENV,
  enabled:
    process.env.EXPO_PUBLIC_APP_ENV !== "development" &&
    !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

const queryClient = new QueryClient();

function AppContent() {
  const { user } = useActiveUser();
  const router = useRouter();
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const data = lastNotificationResponse?.notification.request.content.data as any;
    if (data?.type === "attendance_rsvp" && data.courseId && data.classId) {
      router.push(
        `/private/user/attendance/rsvp?courseId=${data.courseId}&classId=${data.classId}&courseTitle=${encodeURIComponent(data.courseTitle ?? "")}` as any
      );
    }
  }, [lastNotificationResponse]);

  return (
    <Stack>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="public" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="private" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AppContent />
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </QueryClientProvider>
  );
});
