import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type ReviewEnrollmentInput = {
  enrollmentId: string;
  status: "approved" | "rejected";
};

/**
 * Admin approves or rejects a request. Approving adds the student to the
 * course (database trigger `enrollment_approved`).
 */
export const useReviewEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId, status }: ReviewEnrollmentInput) => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("enrollments")
        .update({
          status,
          reviewed_by: session.session?.user.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["annualFeeDue"] });
      queryClient.invalidateQueries({ queryKey: ["myCourses"] });
      queryClient.invalidateQueries({ queryKey: ["courseMember"] });
      queryClient.invalidateQueries({ queryKey: ["membersByCourse"] });
      queryClient.invalidateQueries({ queryKey: ["availableStudents"] });
      Alert.alert("Éxito", "Matrícula actualizada.");
    },
    onError: (error) => {
      console.error("Error reviewing enrollment:", error);
      Alert.alert("Error", "No se pudo actualizar la matrícula.");
    },
  });
};
