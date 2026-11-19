import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { PaymentReportSchema } from "./schema";

/** Admin: payment totals and the last 6 months, computed by the database (payment_report). */
export const usePaymentReport = () => {
  const fetchPaymentReport = async () => {
    const { data, error } = await supabase.rpc("payment_report");
    if (error) throw error;
    return PaymentReportSchema.parse(data);
  };

  return useQuery({
    queryKey: ["reports", "payments"],
    queryFn: fetchPaymentReport,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
