import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { RsvpStatus } from "./schema";

type AttendanceRowInput = {
  userId: string;
  attended: boolean;
  rsvpStatus: RsvpStatus | null;
};

type UpsertAttendanceInput = {
  classId: string;
  rows: AttendanceRowInput[];
};

/** The teacher (or an admin) saves the attendance sheet of a class. */
export const useUpsertAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, rows }: UpsertAttendanceInput) => {
      if (rows.length === 0) return;
      const { error } = await supabase.from("attendance").upsert(
        rows.map((row) => ({
          class_id: classId,
          user_id: row.userId,
          attended: row.attended,
          rsvp_status: row.rsvpStatus,
        })),
        { onConflict: "class_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      Alert.alert("Éxito", "Asistencias guardadas exitosamente");
    },
    onError: (error) => {
      console.error("Error saving attendance:", error);
      Alert.alert("Error", "Asistencia no ha sido guardada. Intente de nuevo, por favor");
    },
  });
};
