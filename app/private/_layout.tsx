import { PrivacyConsentModal } from "@/components/PrivacyConsentModal";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useAcceptConsent } from "@/hooks/user/useAcceptConsent";
import { useUserInfo } from "@/hooks/user/useUserInfo";
import { Redirect, Stack } from "expo-router";
import React from "react";
import { ActivityIndicator } from "react-native";

// Default screen of this stack (where sign-in lands) and the back destination
// when a link opens a deeper screen. Replaces Stack's initialRouteName (SDK 58).
export const unstable_settings = { anchor: "(tabs)" };

export default function PrivateLayout() {
  const { user, isLoading } = useActiveUser();
  const { data: userData } = useUserInfo(user?.uid ?? "");
  const { mutateAsync: acceptConsent } = useAcceptConsent();

  if (isLoading) return <ActivityIndicator />;
  if (!user) return <Redirect href="/public/login" />;

  return (
    <React.Fragment>
      <Stack>
        {/* Bottom tab bar (home, courses, payments, notices, users, profile). */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="user/course/[courseId]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="user/events/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="teacher" options={{ headerShown: false }} />
        {/* MarketPlace */}
        <Stack.Screen
          name="marketplace/MarketplaceList"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="marketplace/MarketplaceDetail"
          options={{ headerShown: false }}
        />
        {/* Encuestas */}
        <Stack.Screen
          name="user/surveys/list"
          options={{
            headerShown: false,
            title: "Encuestas Disponibles",
          }}
        />
        <Stack.Screen
          name="user/surveys/take/[surveyId]"
          options={{
            headerShown: false,
            title: "Responder Encuesta",
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="user/enrollment/createEnrollment"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="user/attendance/rsvp"
          options={{ headerShown: false }}
        />
      </Stack>
      <PrivacyConsentModal
        visible={userData !== undefined && userData.consentAccepted !== true}
        onAccept={() => acceptConsent(user.uid)}
      />
    </React.Fragment>
  );
}
