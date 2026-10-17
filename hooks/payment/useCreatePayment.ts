import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { ReceiptImage, uploadReceipt } from "../receipts/receiptStorage";

type CreatePaymentInput = {
  courseIds: string[];
  receipt: ReceiptImage;
  monthlyFare: number;
  lateFare: number;
  daysLate: number;
  totalAmount: number;
  annualFeeYear: number | null;
};

/** A student submits a monthly payment with its receipt, pending admin review. */
export const useCreatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error("No hay una sesión activa.");

      const receiptPath = await uploadReceipt(userId, input.receipt);
      const { data: payment, error } = await supabase
        .from("payments")
        .insert({
          user_id: userId,
          monthly_fare: input.monthlyFare,
          late_fare: input.lateFare,
          days_late: input.daysLate,
          is_late: input.daysLate > 0,
          total_amount: input.totalAmount,
          annual_fee_year: input.annualFeeYear,
          proof_path: receiptPath,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (input.courseIds.length > 0) {
        const { error: coursesError } = await supabase
          .from("payment_courses")
          .insert(input.courseIds.map((courseId) => ({ payment_id: payment.id, course_id: courseId })));
        if (coursesError) throw coursesError;
      }
      return payment.id;
    },
    // Settled, not success: if only the course list failed, the payment row
    // exists and the screen must still see it as pending (no double payment).
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["annualFeeDue"] });
    },
    onSuccess: () => {
      Alert.alert("Éxito", "El pago se ha enviado exitosamente.");
    },
    onError: (error) => {
      console.error("Error creating payment:", error);
      Alert.alert("Error", "El pago no ha podido ser enviado. Intente de nuevo por favor.");
    },
  });
};
