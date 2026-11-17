import { formatDayMonth, formatLongDate } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { lastDayBefore } from "./membershipRules";
import {
  MEMBERSHIP_AFFECTED_KEYS,
  membershipChangeResultSchema,
  membershipErrorMessage,
  type RequestedChangeKind,
} from "./schema";

type RequestMembershipChangeInput = {
  kind: RequestedChangeKind;
  /** The courses that leave, for a drop; a cancel covers every course. */
  courseIds: string[];
  /** Optional; empty when the student wrote nothing. */
  reason: string;
};

/**
 * The student drops some courses or cancels the membership. The database
 * checks the rules, picks the date it starts on and tells the admins
 * (request_membership_change); dropping every course is a cancel.
 */
export const useRequestMembershipChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kind, courseIds, reason }: RequestMembershipChangeInput) => {
      const { data, error } = await supabase.rpc("request_membership_change", {
        p_kind: kind,
        p_course_ids: kind === "drop" ? courseIds : undefined,
        p_reason: reason.trim() || undefined,
      });
      if (error) throw error;
      return membershipChangeResultSchema.parse(data);
    },
    // Settled: a refused request also means the preview the screen showed is stale.
    onSettled: () => {
      for (const queryKey of MEMBERSHIP_AFFECTED_KEYS) queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: (change) => {
      if (!change.effectiveDate) return;
      Alert.alert(
        change.kind === "cancel" ? "Cancelación programada" : "Baja programada",
        `Empieza el ${formatLongDate(change.effectiveDate)}. Puedes deshacerla hasta el ${formatDayMonth(
          lastDayBefore(change.effectiveDate),
        )}.`,
      );
    },
    onError: (error) => {
      const message = membershipErrorMessage(error);
      if (message) console.warn("Membership change refused:", error.message);
      else console.error("Error requesting a membership change:", error);
      Alert.alert("No se pudo programar el cambio", message ?? "Intenta de nuevo en un momento.");
    },
  });
};
