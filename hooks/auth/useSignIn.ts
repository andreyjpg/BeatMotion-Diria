import { supabase } from "@/lib/supabase";
import type { AuthError } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";

type SignInInput = { email: string; password: string };

// On success the AuthProvider receives the new session and the root layout
// opens the app; screens only handle errors (typed, so they can read `code`).
export const useSignIn = () => {
  return useMutation<void, AuthError, SignInInput>({
    mutationFn: async ({ email, password }) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
  });
};
