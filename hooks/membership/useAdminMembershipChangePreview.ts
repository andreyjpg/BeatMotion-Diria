import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { adminMembershipChangePreviewSchema, membershipKeys } from "./schema";

/**
 * Admin: what a change for the student would mean now, from the database
 * (admin_membership_change_preview): when it starts, why it can't be made,
 * the end of a pause and the unpaid month a pause from today wouldn't charge.
 * Always fresh: the dates depend on today.
 */
export const useAdminMembershipChangePreview = (userId?: string) => {
  const fetchPreview = async () => {
    const { data, error } = await supabase.rpc("admin_membership_change_preview", { p_user_id: userId! });
    if (error) throw error;
    // The function always returns one row.
    return adminMembershipChangePreviewSchema.parse(data[0]);
  };

  return useQuery({
    queryKey: membershipKeys.adminPreview(userId ?? ""),
    queryFn: fetchPreview,
    enabled: !!userId,
    staleTime: 0,
  });
};
