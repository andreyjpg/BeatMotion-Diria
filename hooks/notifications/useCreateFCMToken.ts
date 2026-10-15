import { firestore } from "@/firebaseConfig";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect } from "react";

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

      const ref = doc(firestore, "pushTokens", user.uid);
      await setDoc(
        ref,
        {
          token: expoToken,
          role: user.role,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
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
