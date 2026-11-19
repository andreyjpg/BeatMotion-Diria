import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { signAvatarUrls, withPhotoUrl } from "../storage/avatarStorage";
import { PROFILE_COLUMNS } from "../user/userSchema";
import { MEMBER_COLUMNS, membersByCourseSchema, toMember } from "./schema";

// Each member comes with its profile (one query instead of loading every user).
const MEMBERS_WITH_PROFILE = `${MEMBER_COLUMNS}, userInfo:profiles!course_members_user_id_fkey(${PROFILE_COLUMNS})` as const;

/** The course's current students (active memberships) with their profiles. */
export const useMembersByCourse = (courseId: string) => {
  const getCourseMembers = async () => {
    const { data, error } = await supabase
      .from("course_members")
      .select(MEMBERS_WITH_PROFILE)
      .eq("course_id", courseId)
      .eq("active", true);
    if (error) throw error;
    const urls = await signAvatarUrls(data.map((row) => row.userInfo.photoPath));
    return membersByCourseSchema.parse(
      data.map((row) => ({ ...toMember(row), userInfo: withPhotoUrl(row.userInfo, urls) })),
    );
  };

  return useQuery({
    queryKey: ["membersByCourse", courseId],
    queryFn: getCourseMembers,
    enabled: !!courseId,
  });
};
