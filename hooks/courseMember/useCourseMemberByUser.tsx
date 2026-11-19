import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "react-native";
import { courseMemberSchema, MEMBER_COLUMNS, toMember } from "./schema";

// All of a user's course memberships (active and past).
const useCourseMemberByUser = (userId: string) => {
  const getCourseMemberByUser = async () => {
    try {
      const { data, error } = await supabase.from("course_members").select(MEMBER_COLUMNS).eq("user_id", userId);
      if (error) throw error;
      return courseMemberSchema.parse(data.map(toMember));
    } catch (error) {
      console.error("Error fetching course member by user:", error);
      Alert.alert("Error fetching course member by user");
      throw error;
    }
  };
  return useQuery({
    queryKey: ["courseMember", userId],
    queryFn: getCourseMemberByUser,
    enabled: !!userId,
    staleTime: 1000 * 60 * 20, // 20 minutes
    refetchOnWindowFocus: false,
  });
};

export { useCourseMemberByUser };
