import { SHOW_FEATURE_MOCKS } from "@/constants/featureMocks";
import { Redirect, Stack } from "expo-router";

// TODO(ayuda): MOCK of the help section ("3 · Ayuda y soporte" on the
// "Funciones nuevas (mock)" canvas page). Nothing is sent: the real version
// emails the support address (still to be defined) from an Edge Function, see
// TODO.md. These screens don't exist in production builds.
const HelpLayout = () => {
  if (!SHOW_FEATURE_MOCKS) return <Redirect href="/private/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
};

export default HelpLayout;
