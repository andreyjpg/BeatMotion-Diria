import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";

type ResetPasswordInput = { email: string; code: string; password: string };

export class InvalidResetCodeError extends Error {}

/**
 * Verifies the emailed code and sets the new password in one call chain:
 * verifying signs the user in, which makes the app leave the reset screen,
 * so both steps must run here rather than across two screen actions.
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ email, code, password }: ResetPasswordInput) => {
      const { error: codeError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "recovery",
      });
      if (codeError) throw new InvalidResetCodeError(codeError.message);

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  });
};
