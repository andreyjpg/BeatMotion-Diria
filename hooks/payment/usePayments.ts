import { supabase } from "@/lib/supabase";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ReviewStatus } from "../enrollment/schema";
import { signAvatarUrls, withPhotoUrl } from "../storage/avatarStorage";
import { signReceiptUrls } from "../storage/receiptStorage";
import { PAYMENT_DETAIL_COLUMNS, PaymentDetailSchema, toPayment } from "./schema";

const PAGE_SIZE = 20;

/**
 * Admin list: payments in one status, 20 at a time (the approved list grows
 * every month). Pending ones come most days late first, then oldest first, so
 * the ones waiting longest get reviewed; reviewed ones newest first. Only the
 * loaded page's receipts and pictures get a signed URL. `data` is the flat list
 * of loaded payments; call fetchNextPage at the end of the list.
 */
export const usePayments = (status: ReviewStatus) => {
  const fetchPage = async ({ pageParam }: { pageParam: number }) => {
    const from = pageParam * PAGE_SIZE;
    const query = supabase
      .from("payments")
      .select(PAYMENT_DETAIL_COLUMNS)
      .eq("status", status);
    const ordered =
      status === "pending"
        ? query
            .order("days_late", { ascending: false })
            .order("created_at", { ascending: true })
        : query.order("created_at", { ascending: false });
    const { data, error } = await ordered
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const urls = await signReceiptUrls(data.map((row) => row.receiptPath));
    const photoUrls = await signAvatarUrls(data.map((row) => row.user?.photoPath));
    return PaymentDetailSchema.parse(
      data.map((row) => ({
        ...toPayment(row, urls),
        user: row.user && withPhotoUrl(row.user, photoUrls),
      })),
    );
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
