import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { signReceiptUrls } from "../receipts/receiptStorage";
import { PAYMENT_COLUMNS, PaymentSchema, toPayment } from "./schema";

/** The student's payments, newest first, with receipt URLs. */
export const usePaymentsByUser = (userId?: string) => {
  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select(PAYMENT_COLUMNS)
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const urls = await signReceiptUrls(data.map((row) => row.receiptPath));
    return PaymentSchema.parse(data.map((row) => toPayment(row, urls)));
  };

  return useQuery({
    queryKey: ["payments", "byUser", userId],
    queryFn: fetchPayments,
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  });
};
