import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The Expo push token this device registered (public.push_tokens is keyed by
 * token). Kept on the device so sign-out can remove it without asking Expo
 * again, which needs a connection.
 */
const STORAGE_KEY = "pushToken";

/** Links this device's token to the signed-in user (taking it from any previous user). */
export async function registerPushToken(token: string) {
  const { error } = await supabase.rpc("register_push_token", { p_token: token });
  if (error) throw error;
  await AsyncStorage.setItem(STORAGE_KEY, token);
}

/**
 * Stops pushes to this device for the user who is signing out. Best effort:
 * signing out must work even offline (the next sign-in moves the token anyway).
 */
export async function unregisterPushToken() {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEY);
    if (!token) return;
    const { error } = await supabase.from("push_tokens").delete().eq("token", token);
    if (error) console.warn("Could not remove the push token:", error.message);
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Could not remove the push token:", error);
  }
}
