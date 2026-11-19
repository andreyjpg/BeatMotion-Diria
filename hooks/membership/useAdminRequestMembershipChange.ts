import { formatDayMonth } from "@/constants/helpers";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import {
  adminMembershipErrorMessage,
  MEMBERSHIP_AFFECTED_KEYS,
  membershipChangeResultSchema,
  type PauseMonths,
  type RequestedChangeKind,
} from "./schema";

type AdminRequestMembershipChangeInput = {
  /** The student whose courses change. */
  userId: string;
  kind: RequestedChangeKind;
  /** The courses that leave, for a drop; a cancel and a pause cover every course. */
  courseIds: string[];
  /** Optional; the student can read it too. */
  reason: string;
  /** How long a pause lasts; only for kind "pause". */
  months?: PauseMonths;
};

const DONE_TITLES: Record<RequestedChangeKind, { scheduled: string; applied: string }> = {
  drop: { scheduled: "Baja programada", applied: "Baja aplicada" },
  cancel: { scheduled: "Cancelación programada", applied: "Membresía cancelada" },
  pause: { scheduled: "Pausa programada", applied: "Membresía en pausa" },
};

/** "Empieza el 15 dic." / "Va del 19 nov al 30 dic.", and that the student was told. */
const doneMessage = (isToday: boolean, effectiveDate: Date, endDate: Date | null) => {
  const starts = isToday ? "Empieza hoy." : `Empieza el ${formatDayMonth(effectiveDate)}.`;
  const dates = endDate ? `Va del ${formatDayMonth(effectiveDate)} al ${formatDayMonth(endDate)}.` : starts;
  return `${dates} El estudiante recibe un aviso.`;
};

/**
 * Admin: pauses, cancels or drops courses for a student
 * (admin_request_membership_change). No 8-day notice, yearly limit or
 * late-payer block; it starts on the student's next payment date, or now when
 * that date passed. The student and the other admins are told.
 */
export const useAdminRequestMembershipChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, kind, courseIds, reason, months }: AdminRequestMembershipChangeInput) => {
      const { data, error } = await supabase.rpc("admin_request_membership_change", {
        p_user_id: userId,
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
      const isApplied = change.status === "applied";
      Alert.alert(
        DONE_TITLES[change.kind][isApplied ? "applied" : "scheduled"],
        doneMessage(isApplied, change.effectiveDate, change.endDate),
      );
    },
    onError: (error) => {
      const message = adminMembershipErrorMessage(error);
      if (message) console.warn("Admin membership change refused:", error.message);
      else console.error("Error making a membership change for a student:", error);
      Alert.alert("No se pudo hacer el cambio", message ?? "Intenta de nuevo en un momento.");
    },
  });
};
