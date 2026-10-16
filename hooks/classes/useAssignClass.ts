import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

export const useAssignClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      enrollmentId,
      classId,
      adminId,
    }: {
      enrollmentId: string;
      classId: string;
      adminId: string;
    }) => {
      const { error } = await supabase
        .from("enrollments")
        .update({
          assigned_class_id: classId,
          class_assigned_at: new Date().toISOString(),
          class_assigned_by: adminId,
        })
        .eq("id", enrollmentId);
      if (error) throw error;
    },

    onSuccess: () => {
      Alert.alert("Éxito", "Clase asignada correctamente");
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },

    onError: (err) => {
      console.error("Error al asignar la clase:", err);
      Alert.alert("Error", "No se pudo asignar la clase");
    },
  });
};
