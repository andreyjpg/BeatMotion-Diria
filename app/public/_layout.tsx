import { Stack } from "expo-router";

// Default screen of this stack (where sign-out lands). Replaces Stack's
// initialRouteName (SDK 58).
export const unstable_settings = { anchor: "login" };

// Every public screen draws its own header (ScreenHeader or the login hero).
export default function PublicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signIn" />
      <Stack.Screen name="resetPassword" />
    </Stack>
  );
}
