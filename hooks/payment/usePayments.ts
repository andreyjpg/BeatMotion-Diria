import { supabase } from "@/lib/supabase";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ReviewStatus } from "../enrollment/schema";
import { signReceiptUrls } from "../storage/receiptStorage";
import { PAYMENT_DETAIL_COLUMNS, PaymentDetailSchema, toPayment } from "./schema";

const PAGE_SIZE = 20;

/**
 * Admin list: payments in one status, newest first, 20 at a time (the
 * approved list grows every month). Only the loaded page's receipts get a
 * signed URL. `data` is the flat list of loaded payments; call fetchNextPage
 * at the end of the list.
 */
export const usePayments = (status: ReviewStatus) => {
  const fetchPage = async ({ pageParam }: { pageParam: number }) => {
    const from = pageParam * PAGE_SIZE;
    const { data, error } = await supabase
      .from("payments")
      .select(PAYMENT_DETAIL_COLUMNS)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const urls = await signReceiptUrls(data.map((row) => row.receiptPath));
    return PaymentDetailSchema.parse(data.map((row) => toPayment(row, urls)));
  };

  return useInfiniteQuery({
    queryKey: ["payments", "byStatus", status],
    queryFn: fetchPage,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length,
    select: (data) => data.pages.flat(),
    staleTime: 1000 * 60 * 10, // under the signed URLs' hour
  });
};
