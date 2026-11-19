import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { membershipChangePreviewSchema, membershipKeys } from "./schema";

/**
 * What a drop or cancel asked today would mean, from the database
 * (membership_change_preview): the coming payment date, the date it would
 * start, and why the student can't ask for one now. Always fresh: the dates
 * depend on today.
 */
export const useMembershipChangePreview = (userId?: string) => {
  const fetchPreview = async () => {
    const { data, error } = await supabase.rpc("membership_change_preview");
    if (error) throw error;
    // The function always returns one row.
    return membershipChangePreviewSchema.parse(data[0]);
  };

  return useQuery({
    queryKey: membershipKeys.preview(userId ?? ""),
    queryFn: fetchPreview,
    enabled: !!userId,
    staleTime: 0,
  });
};
