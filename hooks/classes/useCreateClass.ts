import { emptyToNull } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type VideoLink = {
  url: string;
  platform: "youtube" | "vimeo";
  title?: string | null;
};

type CreateClassInput = {
  courseId: string;
  title: string;
  description?: string | null;
  content: string;
  objectives?: string | null;
  date?: string | null; // "YYYY-MM-DD"
  startTime?: string | null; // "HH:MM"
  endTime?: string | null;
  videoLinks?: VideoLink[];
};

export const useCreateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClassInput) => {
      const { data, error } = await supabase
        .from("classes")
        .insert({
          course_id: input.courseId,
          title: input.title,
          description: input.description ?? null,
          content: input.content,
          objectives: input.objectives ?? null,
          date: emptyToNull(input.date),
          start_time: emptyToNull(input.startTime),
          end_time: emptyToNull(input.endTime),
          video_links: input.videoLinks ?? [],
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      Alert.alert("Clase", "Creada correctamente.");
    },
    onError: (error) => {
      console.error("Error creating class:", error);
      Alert.alert("Error", "No se pudo crear la clase.");
    },
  });
};
