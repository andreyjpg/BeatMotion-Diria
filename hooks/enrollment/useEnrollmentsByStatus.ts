import { supabase } from "@/lib/supabase";
import { useInfiniteQuery } from "@tanstack/react-query";
import { signReceiptUrls } from "../storage/receiptStorage";
import {
  ENROLLMENT_DETAIL_COLUMNS,
  enrollmentDetailSchema,
  ReviewStatus,
  toEnrollmentDetail,
} from "./schema";

const PAGE_SIZE = 20;

/**
 * Admin list: enrollment requests in one status, newest first, 20 at a time.
 * Only the loaded page's receipts get a signed URL. `data` is the flat list
 * of loaded requests; call fetchNextPage at the end of the list.
 */
export const useEnrollmentsByStatus = (status: ReviewStatus) => {
  const fetchPage = async ({ pageParam }: { pageParam: number }) => {
    const from = pageParam * PAGE_SIZE;
    const { data, error } = await supabase
      .from("enrollments")
      .select(ENROLLMENT_DETAIL_COLUMNS)
      .eq("status", status)
      .order("submitted_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const urls = await signReceiptUrls(data.map((row) => row.receiptPath));
    return enrollmentDetailSchema.parse(data.map((row) => toEnrollmentDetail(row, urls)));
  };

  return useInfiniteQuery({
    queryKey: ["enrollments", "byStatus", status],
    queryFn: fetchPage,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length,
    select: (data) => data.pages.flat(),
    staleTime: 1000 * 60 * 10, // under the signed URLs' hour
    refetchOnWindowFocus: false,
  });
};
