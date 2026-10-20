import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";

/**
 * Deletes the signed-in user's account and data through the `delete-account`
 * Edge Function. It needs the current session to know whose account it is, so
 * the local sign-out happens afterwards (the account no longer exists on the
 * server by then).
 */
export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await supabase.auth.signOut({ scope: "local" });
    },
  });
};
