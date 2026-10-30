import { Stack } from "expo-router";

// Every public screen draws its own header (ScreenHeader or the login hero).
export default function PublicLayout() {
  return (
    <Stack initialRouteName="login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signIn" />
      <Stack.Screen name="resetPassword" />
    </Stack>
  );
}
