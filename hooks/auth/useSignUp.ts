import { supabase } from "@/lib/supabase";
import type { AuthError } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";

type SignUpInput = {
  email: string;
  password: string;
  name: string;
  lastName: string;
  phone: string;
};

/**
 * Creates the account. The database creates the profile in the same step from
 * this metadata, so an account can't end up without a profile. Resolves to
 * whether the user is signed in right away (false when Supabase requires
 * confirming the email first).
 */
export const useSignUp = () => {
  return useMutation<{ signedIn: boolean }, AuthError, SignUpInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            name: input.name.trim(),
            last_name: input.lastName.trim(),
            phone: input.phone.trim(),
            consent_accepted: true,
          },
        },
      });
      if (error) throw error;
      return { signedIn: !!data.session };
    },
  });
};
