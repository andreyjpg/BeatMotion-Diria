import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { removeMedia, uploadMedia } from "../storage/mediaStorage";
import { EventInput, toEventRow } from "./schema";

type UpdateEventInput = EventInput & {
  id: string;
  /** The banner the event has now, deleted once a new one replaces it. */
  currentBannerPath: string | null;
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, currentBannerPath, ...input }: UpdateEventInput) => {
      const bannerPath = input.banner ? await uploadMedia("events", input.banner) : currentBannerPath;
      const { error } = await supabase
        .from("events")
        .update({ ...toEventRow(input), banner_path: bannerPath })
        .eq("id", id);
      if (error) throw error;
      if (currentBannerPath && bannerPath !== currentBannerPath) {
        await removeMedia([currentBannerPath]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      Alert.alert("Evento", "Evento actualizado correctamente.");
    },
    onError: (error) => {
      console.error("No se pudo actualizar el evento:", error);
      Alert.alert("Error", "No se pudo actualizar el evento.");
    },
  });
};
