import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { RSVP_ERROR_MESSAGES, RsvpStatus } from "./schema";

type SetRsvpInput = {
  classId: string;
  rsvpStatus: RsvpStatus;
};

/**
 * The student answers whether they'll attend a class. Creates their row or
 * changes only the RSVP; `attended` stays as the teacher left it. The
 * database rejects it for a class hidden from students (CLASS_HIDDEN).
 */
export const useSetRsvp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, rsvpStatus }: SetRsvpInput) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error("No hay una sesión activa.");

      const { error } = await supabase
        .from("attendance")
        .upsert(
          { class_id: classId, user_id: userId, rsvp_status: rsvpStatus },
          { onConflict: "class_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error, { classId }) => {
      const message = RSVP_ERROR_MESSAGES[error.message];
      if (!message) {
        console.error("Error setting RSVP:", error);
        Alert.alert("Error", "No se pudo guardar tu respuesta. Intenta de nuevo.");
        return;
      }
      console.warn("RSVP rejected:", error.message);
      // The class is gone for this student: drop it from the cached lists too.
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["classInfo", classId] });
      Alert.alert("Lo sentimos", message);
    },
  });
};
