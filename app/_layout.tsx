// app/_layout.tsx
import palette from "@/constants/palette.json";
import { useSignOut } from "@/hooks/auth/useSignOut";
import { AuthProvider, useActiveUser } from "@/hooks/user/UseActiveUser";
import { Notifications } from "@/lib/notifications";
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_800ExtraBold_Italic,
  Archivo_900Black_Italic,
} from "@expo-google-fonts/archivo";
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import { DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Alert } from "react-native";
import "react-native-reanimated";
import "../global.css";

// Keep the splash screen until the fonts are ready, so text never renders in
// the system font first.
SplashScreen.preventAutoHideAsync();

// The redesign is light-only: navigation backgrounds match the app's ground color.
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.ground,
    card: palette.ground,
    text: palette.ink,
    border: palette.line.DEFAULT,
    primary: palette.ink,
  },
};

// Notifications is null in Expo Go on Android (see lib/notifications.ts).
const useLastNotificationResponse =
  Notifications?.useLastNotificationResponse ?? (() => undefined);

Notifications?.setNotificationHandler({
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
}

export default Sentry.wrap(function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_800ExtraBold_Italic,
    Archivo_900Black_Italic,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });
  // If a font fails to load the app still opens, in the system font.
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={navigationTheme}>
          <AppContent />
          <StatusBar style="dark" />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
});
