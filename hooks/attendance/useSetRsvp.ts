import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { RsvpStatus } from "./schema";

type SetRsvpInput = {
  classId: string;
  rsvpStatus: RsvpStatus;
};

/**
 * The student answers whether they'll attend a class. Creates their row or
 * changes only the RSVP; `attended` stays as the teacher left it.
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
    onError: (error) => {
      console.error("Error setting RSVP:", error);
      Alert.alert("Error", "No se pudo guardar tu respuesta. Intenta de nuevo.");
    },
  });
};
