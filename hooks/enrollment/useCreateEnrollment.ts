import { isUniqueViolation } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import type { PickedImage } from "../storage/compressImage";
import { removeUnusedReceipt, uploadReceipt } from "../storage/receiptStorage";
import { ENROLLMENT_ERROR_MESSAGES } from "./schema";

type CreateEnrollmentInput = {
  courseIds: string[];
  /** Null when there's nothing to pay: Plan Diriá already covers more courses. */
  receipt: PickedImage | null;
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

      const receiptPath = input.receipt ? await uploadReceipt(userId, input.receipt) : null;
      // One request for all the courses, created in a single transaction.
      const { data: enrollmentId, error } = await supabase.rpc("request_enrollment", {
        p_course_ids: input.courseIds,
        p_total_amount: input.totalAmount,
        // The column takes null; the generated types only know the argument as text.
        p_receipt_path: receiptPath as string,
        p_annual_fee_year: input.annualFeeYear ?? undefined,
        // Step 1 (RulesStep) only lets the student continue after accepting the
        // rules; the database records the moment the request is sent.
        p_rules_accepted: true,
      });
      if (error) {
        if (receiptPath) await removeUnusedReceipt(receiptPath);
        throw error;
      }
      return enrollmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["annualFeeDue"] });
    },
    onError: (error) => {
      // A course may have been removed while the screen was open.
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      const expected = isUniqueViolation(error)
        ? "Ya tienes una matrícula activa o pendiente en uno de esos cursos."
        : ENROLLMENT_ERROR_MESSAGES[error.message];
      if (expected) console.warn("Enrollment refused:", error.message);
      else console.error("Error creating enrollment:", error);
      Alert.alert("Error", expected ?? "No se pudo enviar la matrícula. Intenta de nuevo.");
    },
  });
};
