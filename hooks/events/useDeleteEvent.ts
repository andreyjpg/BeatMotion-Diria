import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type DeleteEventInput = { id: string };

/** Soft delete: the event disappears from the app, its signups stay for the records. */
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteEventInput) => {
      const { error } = await supabase.from("events").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      Alert.alert("Evento eliminado");
    },
    onError: (error) => {
      console.error("No se pudo eliminar el evento:", error);
      Alert.alert("Error", "No se pudo eliminar el evento.");
    },
  });
};
