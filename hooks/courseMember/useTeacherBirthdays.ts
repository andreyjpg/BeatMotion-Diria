import { formatYYYYMMDD, weekOf } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { signAvatarUrls, withPhotoUrl } from "../storage/avatarStorage";
import { MEMBER_BIRTHDAY_COLUMNS, memberBirthdaySchema, type TeacherBirthday, toWeekBirthdays } from "./schema";

/**
 * Current students of the teacher's courses whose birthday falls this week
 * (Monday to Sunday), one row per student, with the day and the age they turn.
 * Deactivated accounts and students without a birth date are left out.
 */
export const useTeacherBirthdays = (teacherId: string) => {
  const week = weekOf();

  const fetchTeacherBirthdays = async (): Promise<TeacherBirthday[]> => {
    try {
      const { data, error } = await supabase
        .from("course_members")
        .select(MEMBER_BIRTHDAY_COLUMNS)
        .eq("active", true)
        .eq("course.teacher_id", teacherId)
        .eq("course.is_deleted", false)
        .eq("student.is_active", true)
        .not("student.birth_date", "is", null);
      if (error) throw error;
      const birthdays = toWeekBirthdays(memberBirthdaySchema.parse(data), week);
      const urls = await signAvatarUrls(birthdays.map((student) => student.photoPath));
      return birthdays.map((student) => withPhotoUrl(student, urls));
    } catch (error) {
      // The home just leaves the block out, so log it instead of interrupting.
      console.warn("Could not load this week's birthdays:", error);
      throw error;
    }
  };

  return useQuery({
    // The week is part of the key, so last week's cached list is never shown.
    queryKey: ["teacherBirthdays", teacherId, formatYYYYMMDD(week.start)],
    queryFn: fetchTeacherBirthdays,
    enabled: !!teacherId,
    staleTime: 1000 * 60 * 20, // 20 minutes
    refetchOnWindowFocus: false,
  });
};
