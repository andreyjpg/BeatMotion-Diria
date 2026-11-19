import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { uploadMedia } from "../storage/mediaStorage";
import { EventInput, toEventRow } from "./schema";

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EventInput) => {
      const { data: session } = await supabase.auth.getSession();
      const bannerPath = input.banner ? await uploadMedia("events", input.banner) : null;
      const { data, error } = await supabase
        .from("events")
        .insert({
          ...toEventRow(input),
          banner_path: bannerPath,
          created_by: session.session?.user.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      Alert.alert("Evento", "Evento creado correctamente.");
    },
    onError: (error) => {
      console.error("No se pudo crear el evento:", error);
      Alert.alert("Error", "No se pudo crear el evento.");
    },
  });
};
