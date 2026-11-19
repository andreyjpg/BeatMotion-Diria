import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import {
  ADMIN_MEMBERSHIP_CHANGE_COLUMNS,
  adminMembershipChangesSchema,
  membershipKeys,
  toMembershipChange,
} from "./schema";

/**
 * Admin: a student's membership changes, newest first, with who asked for,
 * undid and ended each one (the scheduled one, the pause in progress and the
 * history).
 */
export const useMembershipChangesByUser = (userId?: string) => {
  const fetchChanges = async () => {
    const { data, error } = await supabase
      .from("membership_changes")
      .select(ADMIN_MEMBERSHIP_CHANGE_COLUMNS)
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return adminMembershipChangesSchema.parse(data.map(toMembershipChange));
  };

  return useQuery({
    queryKey: membershipKeys.changesByUser(userId ?? ""),
    queryFn: fetchChanges,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};
