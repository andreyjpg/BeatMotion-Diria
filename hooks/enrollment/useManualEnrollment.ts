import { isUniqueViolation } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type ManualEnrollmentInput = {
  userId: string;
  courseId: string;
};

/**
 * Admin adds a student to a course directly: an approved, free request, so the
 * membership is created right away (trigger `enrollment_course_added`).
 */
export const useManualEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, courseId }: ManualEnrollmentInput) => {
      const { data: enrollmentId, error } = await supabase.rpc("assign_student_to_course", {
        p_user_id: userId,
        p_course_id: courseId,
      });
      if (error) throw error;
      return enrollmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["myCourses"] });
      queryClient.invalidateQueries({ queryKey: ["courseMember"] });
      queryClient.invalidateQueries({ queryKey: ["membersByCourse"] });
      queryClient.invalidateQueries({ queryKey: ["availableStudents"] });
      Alert.alert("Éxito", "El estudiante ha sido asignado al curso correctamente.");
    },
    onError: (error) => {
      console.error("Error en asignación manual:", error);
      Alert.alert(
        "Error",
        isUniqueViolation(error)
          ? "El estudiante ya está inscrito en este curso o tiene una solicitud pendiente."
          : "No se pudo asignar el estudiante al curso."
      );
    },
  });
};
