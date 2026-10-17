import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type ReviewPaymentInput = {
  paymentId: string;
  status: "approved" | "rejected";
};

/**
 * Admin approves or rejects a payment. Approving puts the student's courses
 * back to "ok" and moves their due date forward (trigger `payment_approved`).
 */
export const useReviewPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, status }: ReviewPaymentInput) => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("payments")
        .update({
          status,
          reviewed_by: session.session?.user.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["annualFeeDue"] });
      queryClient.invalidateQueries({ queryKey: ["myCourses"] });
      queryClient.invalidateQueries({ queryKey: ["courseMember"] });
      queryClient.invalidateQueries({ queryKey: ["membersByCourse"] });
      Alert.alert("Éxito", "El pago ha sido actualizado con éxito.");
    },
    onError: (error) => {
      console.error("Error reviewing payment:", error);
      Alert.alert(
        "Error",
        "Ha ocurrido un error en la actualización del pago, inténtelo de nuevo por favor."
      );
    },
  });
};
