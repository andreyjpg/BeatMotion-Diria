import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const acceptConsent = async (uid: string) => {
  const { error } = await supabase
    .from("profiles")
    .update({ consent_accepted: true, consent_accepted_at: new Date().toISOString() })
    .eq("id", uid);
  if (error) throw error;
};

export const useAcceptConsent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptConsent,
    // Refetch so the consent modal closes.
    onSuccess: (_data, uid) => queryClient.invalidateQueries({ queryKey: ["user", uid] }),
  });
};
