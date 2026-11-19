import { formatDayMonth, formatLongDate } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { lastDayBefore } from "./membershipRules";
import {
  MEMBERSHIP_AFFECTED_KEYS,
  membershipChangeResultSchema,
  membershipErrorMessage,
  type PauseMonths,
  type RequestedChangeKind,
} from "./schema";

type RequestMembershipChangeInput = {
  kind: RequestedChangeKind;
  /** The courses that leave, for a drop; a cancel and a pause cover every course. */
  courseIds: string[];
  /** Optional; empty when the student wrote nothing. */
  reason: string;
  /** How long a pause lasts; only for kind "pause". */
  months?: PauseMonths;
};

const SCHEDULED_TITLES: Record<RequestedChangeKind, string> = {
  drop: "Baja programada",
  cancel: "Cancelación programada",
  pause: "Pausa programada",
};

/** "Empieza el … Puedes deshacerla hasta el …", or the pause's dates. */
const scheduledMessage = (effectiveDate: Date, endDate: Date | null) => {
  const lastDay = formatDayMonth(lastDayBefore(effectiveDate));
  if (endDate) {
    return `Va del ${formatDayMonth(effectiveDate)} al ${formatDayMonth(endDate)}. Puedes deshacerla hasta el ${lastDay}.`;
  }
  return `Empieza el ${formatLongDate(effectiveDate)}. Puedes deshacerla hasta el ${lastDay}.`;
};

/**
 * The student drops some courses, cancels the membership or pauses it for
 * 1 to 3 months. The database checks the rules, picks the dates and tells the
 * admins (request_membership_change); dropping every course is a cancel.
 */
export const useRequestMembershipChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kind, courseIds, reason, months }: RequestMembershipChangeInput) => {
      const { data, error } = await supabase.rpc("request_membership_change", {
        p_kind: kind,
        p_course_ids: kind === "drop" ? courseIds : undefined,
        p_reason: reason.trim() || undefined,
        p_months: kind === "pause" ? months : undefined,
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
      Alert.alert(SCHEDULED_TITLES[change.kind], scheduledMessage(change.effectiveDate, change.endDate));
    },
    onError: (error) => {
      const message = membershipErrorMessage(error);
      if (message) console.warn("Membership change refused:", error.message);
      else console.error("Error requesting a membership change:", error);
      Alert.alert("No se pudo programar el cambio", message ?? "Intenta de nuevo en un momento.");
    },
  });
};
