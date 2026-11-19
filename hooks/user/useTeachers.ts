import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type Teacher = {
  id: string;
  name: string;
  lastName: string;
  email: string;
};

// Who can be assigned to teach a course: active teachers and admins.
const fetchTeachers = async (): Promise<Teacher[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, lastName:last_name, email")
    .in("role", ["teacher", "admin"])
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data;
};

export const useTeachers = () => {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: fetchTeachers,
    staleTime: 1000 * 60 * 10,
  });
};
