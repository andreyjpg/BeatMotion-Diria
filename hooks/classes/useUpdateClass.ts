import { emptyToNull } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type ClassUpdate = Database["public"]["Tables"]["classes"]["Update"];

type Video = {
  url: string;
  platform: string;
  title?: string | null;
};

type ClassPatch = {
  title?: string;
  description?: string;
  content?: string;
  objectives?: string;
  date?: string; // "YYYY-MM-DD" or "" for none
  startTime?: string; // "HH:MM" or "" for none
  endTime?: string;
  videoLinks?: Video[];
  isDeleted?: boolean;
};

type UpdateClassBody = { id: string; patch: ClassPatch };

const toUpdate = (patch: ClassPatch): ClassUpdate => ({
  ...(patch.title !== undefined && { title: patch.title }),
  ...(patch.description !== undefined && { description: emptyToNull(patch.description) }),
  ...(patch.content !== undefined && { content: patch.content }),
  ...(patch.objectives !== undefined && { objectives: emptyToNull(patch.objectives) }),
  ...(patch.date !== undefined && { date: emptyToNull(patch.date) }),
  ...(patch.startTime !== undefined && { start_time: emptyToNull(patch.startTime) }),
  ...(patch.endTime !== undefined && { end_time: emptyToNull(patch.endTime) }),
  ...(patch.videoLinks !== undefined && { video_links: patch.videoLinks }),
  ...(patch.isDeleted !== undefined && { is_deleted: patch.isDeleted }),
});

export const useUpdateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: UpdateClassBody) => {
      const { error } = await supabase.from("classes").update(toUpdate(patch)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["classInfo", id] });
      Alert.alert("Clase", "Actualizada correctamente.");
    },
    onError: (error) => {
      console.error("Error updating class:", error);
      Alert.alert("Error", "No se pudo actualizar la clase.");
    },
  });
};
