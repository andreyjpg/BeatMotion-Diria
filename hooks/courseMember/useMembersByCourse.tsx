import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { PROFILE_COLUMNS } from "../user/userSchema";
import { MEMBER_COLUMNS, membersByCourseSchema, toMember } from "./schema";

// Each member comes with its profile (one query instead of loading every user).
const MEMBERS_WITH_PROFILE = `${MEMBER_COLUMNS}, userInfo:profiles!course_members_user_id_fkey(${PROFILE_COLUMNS})` as const;

export const useMembersByCourse = (courseId: string) => {
  const getCourseMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("course_members")
        .select(MEMBERS_WITH_PROFILE)
        .eq("course_id", courseId);
      if (error) throw error;
      return membersByCourseSchema.parse(data.map(toMember));
    } catch (error) {
      console.error("Error in useMembersByCourse", error);
    }
  };

  return useQuery({
    queryKey: ["membersByCourse", courseId],
    queryFn: getCourseMembers,
    enabled: !!courseId,
  });
};
