import { isUniqueViolation } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { ReceiptImage, uploadReceipt } from "../receipts/receiptStorage";

type CreateEnrollmentInput = {
  courseIds: string[];
  receipt: ReceiptImage;
  totalAmount: number;
  annualFeeYear: number | null;
};

/** A student requests one or more courses with a single receipt: one enrollment request. */
export const useCreateEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEnrollmentInput) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error("No hay una sesión activa.");

      const receiptPath = await uploadReceipt(userId, input.receipt);
      // One request for all the courses, created in a single transaction.
      const { data: enrollmentId, error } = await supabase.rpc("request_enrollment", {
        p_course_ids: input.courseIds,
        p_total_amount: input.totalAmount,
        p_receipt_path: receiptPath,
        p_annual_fee_year: input.annualFeeYear ?? undefined,
      });
      if (error) throw error;
      return enrollmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["annualFeeDue"] });
      Alert.alert("Matrícula enviada", "Será revisada pronto.");
    },
    onError: (error) => {
      console.error("Error creating enrollment:", error);
      Alert.alert(
        "Error",
        isUniqueViolation(error)
          ? "Ya tienes una matrícula activa o pendiente en uno de esos cursos."
          : "No se pudo enviar la matrícula. Intenta de nuevo."
      );
    },
  });
};
