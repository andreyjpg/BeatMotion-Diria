import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { signReceiptUrls } from "../storage/receiptStorage";
import {
  ENROLLMENT_DETAIL_COLUMNS,
  enrollmentDetailSchema,
  ReviewStatus,
  toEnrollmentDetail,
} from "./schema";

/** Admin list: enrollment requests in one status, newest first, with receipt URLs. */
export const useEnrollmentsByStatus = (status: ReviewStatus) => {
  const fetchEnrollments = async () => {
    const { data, error } = await supabase
      .from("enrollments")
      .select(ENROLLMENT_DETAIL_COLUMNS)
      .eq("status", status)
      .order("submitted_at", { ascending: false });
    if (error) throw error;

    const urls = await signReceiptUrls(data.map((row) => row.receiptPath));
    return enrollmentDetailSchema.parse(data.map((row) => toEnrollmentDetail(row, urls)));
  };

  return useQuery({
    queryKey: ["enrollments", "byStatus", status],
    queryFn: fetchEnrollments,
    staleTime: 1000 * 60 * 10, // under the signed URLs' hour
    refetchOnWindowFocus: false,
  });
};
