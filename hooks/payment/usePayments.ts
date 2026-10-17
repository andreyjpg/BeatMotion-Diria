import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { ReviewStatus } from "../enrollment/schema";
import { signReceiptUrls } from "../receipts/receiptStorage";
import { PAYMENT_DETAIL_COLUMNS, PaymentDetailSchema, toPayment } from "./schema";

/** Admin list: payments in one status, newest first, with receipt URLs. */
export const usePayments = (status: ReviewStatus) => {
  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select(PAYMENT_DETAIL_COLUMNS)
      .eq("status", status)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const urls = await signReceiptUrls(data.map((row) => row.receiptPath));
    return PaymentDetailSchema.parse(data.map((row) => toPayment(row, urls)));
  };

  return useQuery({
    queryKey: ["payments", "byStatus", status],
    queryFn: fetchPayments,
    staleTime: 1000 * 60 * 10, // under the signed URLs' hour
  });
};
