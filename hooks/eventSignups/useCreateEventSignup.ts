import { isUniqueViolation } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import type { PickedImage } from "../storage/compressImage";
import { removeUnusedReceipt, uploadReceipt } from "../storage/receiptStorage";
import { eventSignupsKeys, SIGNUP_ERROR_MESSAGES } from "./schema";

type CreateEventSignupInput = {
  eventId: string;
  inviteeCount: number;
  /** Required for paid events. */
  receipt: PickedImage | null;
};

/**
 * The student signs up (with guests on public events). The database sets the
 * price and status from the event and checks the remaining capacity
 * (trigger prepare_event_signup), so the app only sends who and how many.
 */
export const useCreateEventSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, inviteeCount, receipt }: CreateEventSignupInput) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error("No hay una sesión activa.");

      const receiptPath = receipt ? await uploadReceipt(userId, receipt) : null;
      const { data, error } = await supabase
        .from("event_signups")
        .insert({
          event_id: eventId,
          user_id: userId,
          invitee_count: Math.max(0, Math.floor(inviteeCount)),
          receipt_path: receiptPath,
        })
        .select("status")
        .single();
      if (error) {
        if (receiptPath) await removeUnusedReceipt(receiptPath);
        throw error;
      }
      return data.status;
    },
    onSuccess: (status, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventSignupsKeys.event(eventId) });
      Alert.alert(
        "Registro enviado",
        status === "autoApproved"
          ? "Registro confirmado."
          : "Solicitud enviada. Espera la validación del pago.",
      );
    },
    onError: (error, { eventId }) => {
      console.error("Error creando inscripción de evento:", error);
      // Spots may have changed: show the current count.
      queryClient.invalidateQueries({ queryKey: eventSignupsKeys.spotsTaken(eventId) });
      const message = isUniqueViolation(error)
        ? "Ya te registraste para este evento."
        : (SIGNUP_ERROR_MESSAGES[error.message] ??
          "No se pudo completar el registro. Intenta de nuevo o contacta al administrador.");
      Alert.alert("Lo sentimos", message);
    },
  });
};
