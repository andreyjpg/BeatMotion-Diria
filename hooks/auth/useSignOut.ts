import { unregisterPushToken } from "@/hooks/notifications/pushToken";
import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";

// Signing out also clears the cached data (see AuthProvider) and the root
// layout switches back to the login screen.
export const useSignOut = () => {
  return useMutation({
    mutationFn: async () => {
      // While still signed in: this device stops receiving this user's pushes.
      await unregisterPushToken();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
};
