import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { supabase } from "@/lib/supabase";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

/**
 * Registers this device's Expo push token for the signed-in user. Runs on
 * every sign-in, so devices register themselves again after the migration.
 */
export const useCreateFCMToken = () => {
  const { user } = useActiveUser();

  useEffect(() => {
    if (!user?.uid) return;

    const registerToken = async () => {
      if (!Device.isDevice) {
        console.error("Push notifications only work on a physical device");
        return;
      }

      // Request permission if needed
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.error("Permission not granted for push notifications");
        return;
      }

      const { data: expoToken } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      const { error } = await supabase
        .from("push_tokens")
        .upsert({ user_id: user.uid, token: expoToken }, { onConflict: "user_id" });
      if (error) console.error("Error saving push token:", error);
    };

    // Push tokens aren't available everywhere (Expo Go on Android throws since
    // SDK 55); a missing token must never break the app.
    const safeRegisterToken = () =>
      registerToken().catch((error) =>
        console.warn("Push notifications unavailable:", error?.message ?? error)
      );

    safeRegisterToken();

    const subscription = Notifications.addNotificationResponseReceivedListener(
      () => {
        safeRegisterToken();
      }
    );

    return () => subscription.remove();
  }, [user?.uid]);
};
