import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";

// Emails a one-time code (the "Reset Password" template must include
// {{ .Token }}). Supabase doesn't reveal whether the email has an account.
export const useSendResetCode = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
    },
  });
};
