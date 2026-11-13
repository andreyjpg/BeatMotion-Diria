import { useQueryClient } from "@tanstack/react-query";

/**
 * Refetches every attendance query on screen (keys under ["attendance"]). For
 * lists whose rows load their own attendance, like the course progress of each
 * Mis cursos card, so pulling to refresh updates them too.
 */
export const useRefreshAttendance = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["attendance"] });
};
