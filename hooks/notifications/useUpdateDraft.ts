import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { DraftInput } from "./notificationSchemas";

type UpdateDraftInput = DraftInput & { id: string };

export const useUpdateDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateDraftInput) => {
      const { error } = await supabase
        .from("notification_drafts")
        .update({
          title: input.title.trim(),
          content: input.content.trim(),
          recipients: input.recipients,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      Alert.alert("Borrador guardado correctamente.");
    },
    onError: (error) => {
      console.error("Error in draft update", error);
      Alert.alert("Error al guardar. Intentelo de nuevo.");
    },
  });
};
