import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { FareSchema } from "./schema";

export const useFares = () => {
  const fetchFares = async () => {
    const { data, error } = await supabase
      .from("fares")
      .select("id, description, fare:amount, type, numCourse:num_courses");
    if (error) throw error;
    return FareSchema.parse(data);
  };

  return useQuery({
    queryKey: ["fares"],
    queryFn: fetchFares,
    staleTime: Infinity,
  });
};
