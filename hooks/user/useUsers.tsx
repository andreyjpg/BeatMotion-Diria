import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { signAvatarUrls, withPhotoUrl } from "../storage/avatarStorage";
import { toUserListItem, USER_LIST_COLUMNS, userListSchema } from "./userSchema";

/** Admin: every profile by name, with current courses and payment status. */
export const useUsers = () => {
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(USER_LIST_COLUMNS)
      .order("name")
      .order("last_name");
    if (error) throw error;
    const urls = await signAvatarUrls(data.map((row) => row.photoPath));
    return userListSchema.parse(data.map((row) => withPhotoUrl(toUserListItem(row), urls)));
  };

  return useQuery({
    queryKey: ["users", "list"],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
