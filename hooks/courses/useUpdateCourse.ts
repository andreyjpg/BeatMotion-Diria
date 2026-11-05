import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];

type CoursePatch = {
  title?: string;
  teacherId?: string | null;
  description?: string;
  level?: string;
  day?: string;
  isDeleted?: boolean;
  branchId?: string | null;
  startDate?: string | null; // "YYYY-MM-DD"
};

type UpdateCourseBody = { id: string; patch: CoursePatch };

// Soft-deleting a course (isDeleted: true) also deactivates its memberships;
// the database does that in a trigger.
const toUpdate = (patch: CoursePatch): CourseUpdate => ({
  ...(patch.title !== undefined && { title: patch.title }),
  ...(patch.teacherId !== undefined && { teacher_id: patch.teacherId }),
  ...(patch.description !== undefined && { description: patch.description }),
  ...(patch.level !== undefined && { level: Number(patch.level) }),
  ...(patch.day !== undefined && { day: patch.day as CourseUpdate["day"] }),
  ...(patch.isDeleted !== undefined && { is_deleted: patch.isDeleted }),
  ...(patch.branchId !== undefined && { branch_id: patch.branchId }),
  ...(patch.startDate !== undefined && { start_date: patch.startDate }),
});

export const useUpdateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: UpdateCourseBody) => {
      const { error } = await supabase.from("courses").update(toUpdate(patch)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { patch }) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["courseDetail"] });
      queryClient.invalidateQueries({ queryKey: ["myCourses"] });
      Alert.alert("Curso", patch.isDeleted ? "Eliminado correctamente." : "Actualizado correctamente.");
    },
    onError: (error) => {
      console.error("Error updating course:", error);
      Alert.alert("Error", "No se pudo actualizar el curso.");
    },
  });
};
