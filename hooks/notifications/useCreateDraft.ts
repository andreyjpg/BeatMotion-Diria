import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { DraftInput } from "./notificationSchemas";

export const useCreateDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DraftInput) => {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("notification_drafts")
        .insert({
          title: input.title.trim(),
          content: input.content.trim(),
          recipients: input.recipients,
          created_by: session.session?.user.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      Alert.alert("Éxito", "Borrador ha sido guardado correctamente.");
    },
    onError: (error) => {
      console.error("Error creating draft:", error);
      Alert.alert("Error", "No se pudo guardar el borrador, intentar de nuevo.");
    },
  });
};
