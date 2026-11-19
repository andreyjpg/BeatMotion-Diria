import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { MEMBERSHIP_CHANGE_COLUMNS, membershipChangesSchema, membershipKeys, toMembershipChange } from "./schema";

/**
 * The student's membership changes, newest first: the scheduled one (at most
 * one, see scheduledChangeOf) and the ones applied or withdrawn before.
 */
export const useMembershipChanges = (userId?: string) => {
  const fetchChanges = async () => {
    const { data, error } = await supabase
      .from("membership_changes")
      .select(MEMBERSHIP_CHANGE_COLUMNS)
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return membershipChangesSchema.parse(data.map(toMembershipChange));
  };

  return useQuery({
    queryKey: membershipKeys.changes(userId ?? ""),
    queryFn: fetchChanges,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};
