import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type Weekday = Database["public"]["Enums"]["weekday"];

type CreateCourseInput = {
  title: string;
  teacherId: string;
  description: string;
  level: string;
  day: string;
  branchId?: string | null;
  createdBy: string;
};

export const useCreateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCourseInput) => {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: input.title,
          teacher_id: input.teacherId,
          description: input.description,
          level: Number(input.level),
          day: input.day as Weekday,
          branch_id: input.branchId ?? null,
          created_by: input.createdBy,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      Alert.alert("Curso", "Curso agregado correctamente.");
    },
    onError: (error) => {
      console.error("Error creating course:", error);
      Alert.alert("Error", "No se pudo guardar el curso.");
    },
  });
};
