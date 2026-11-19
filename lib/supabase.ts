// Must be imported before anything uses crypto.getRandomValues (aes-js keys below).
import "react-native-get-random-values";

import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as aesjs from "aes-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Supabase config is missing: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}

/**
 * Encrypted session storage (pattern from Supabase's Expo guide).
 * expo-secure-store only holds values up to 2048 bytes, too small for a
 * session, so the session is AES-encrypted with a random key that lives in the
 * secure store (iOS Keychain / Android Keystore), and the encrypted session
 * itself goes to AsyncStorage.
 */
class LargeSecureStore {
  private async encrypt(key: string, value: string) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(encryptionKeyHex), new aesjs.Counter(1));
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string) {
    const encrypted = await ReactNativeAsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this.decrypt(key, encrypted);
  }

  async setItem(key: string, value: string) {
    const encrypted = await this.encrypt(key, value);
    await ReactNativeAsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string) {
    await ReactNativeAsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}

const isNative = Platform.OS !== "web";
// Expo's web build also renders pages in Node, where there is no storage and
// no signed-in user: don't look for a session there.
const isServerRender = !isNative && typeof window === "undefined";

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    // The secure store doesn't exist on web; fall back to plain storage there.
    storage: isNative ? new LargeSecureStore() : isServerRender ? undefined : ReactNativeAsyncStorage,
    autoRefreshToken: !isServerRender,
    persistSession: !isServerRender,
    detectSessionInUrl: false,
  },
});

// Refresh the session only while the app is in the foreground.
if (isNative) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
