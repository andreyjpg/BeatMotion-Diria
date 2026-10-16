import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";

// Signing out also clears the cached data (see AuthProvider) and the root
// layout switches back to the login screen.
export const useSignOut = () => {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
};
