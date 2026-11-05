import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

/**
 * expo-notifications, or null where it can't load: Expo Go on Android ships
 * without its native modules, and importing it there crashes the app at
 * startup (SDK 57). Development and store builds always get the module.
 */
export const Notifications: NotificationsModule | null =
  Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? null
    : // Required lazily so the module never initializes in Expo Go on Android.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("expo-notifications") as NotificationsModule);
