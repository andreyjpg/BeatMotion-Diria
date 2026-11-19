import AppText from "@/components/ui/AppText";
import Chip from "@/components/ui/Chip";
import { formatDayMonth, formatDayMonthYear, joinWithAnd, plural } from "@/constants/helpers";
import { pauseMonthsOf, wasWithdrawnByJob } from "@/hooks/membership/membershipRules";
import type { AdminMembershipChange, RequestedChangeKind } from "@/hooks/membership/schema";
import { View } from "react-native";
import ChangeByLine from "./ChangeByLine";

const KIND_LABELS: Record<RequestedChangeKind, string> = {
  pause: "Pausa",
  cancel: "Cancelación",
  drop: "Baja",
};

/** How a past change ended up. */
const statusLabel = (change: AdminMembershipChange) => {
  if (change.status === "applied") return "Aplicada";
  if (change.status === "ended") return "Terminó";
  return wasWithdrawnByJob(change) ? "No empezó" : "Deshecha";
};

/** "30 ene – 28 feb 2026 · 1 mes", "Cancelación desde el 30 oct 2026", "Salsa · desde el 30 oct 2026". */
const titleOf = (change: AdminMembershipChange, courseTitle: (courseId: string) => string) => {
  const since = `desde el ${formatDayMonthYear(change.effectiveDate)}`;
  if (change.kind === "pause" && change.endDate) {
    return `${formatDayMonth(change.effectiveDate)} – ${formatDayMonthYear(change.endDate)} · ${plural(pauseMonthsOf(change), "mes", "meses")}`;
  }
  if (change.kind === "cancel") return `Cancelación ${since}`;
  return `${joinWithAnd(change.courseIds.map(courseTitle))} · ${since}`;
};

type HistoryRowProps = {
  change: AdminMembershipChange;
  courseTitle: (courseId: string) => string;
};

/** One past change: what, when, who asked, and who undid or ended it. */
const HistoryRow = ({ change, courseTitle }: HistoryRowProps) => (
  <View className="gap-1 border-b border-line-soft py-3">
    <View className="flex-row items-center justify-between gap-2">
      <Chip label={KIND_LABELS[change.kind]} tone="muted" />
      <AppText variant="label" tone="muted" className="text-[10px]">
        {statusLabel(change)}
      </AppText>
    </View>
    <AppText variant="bold" className="text-[15px]">
      {titleOf(change, courseTitle)}
    </AppText>
    <ChangeByLine prefix="Por" person={change.creator} date={change.createdAt} reason={change.reason} />
    {wasWithdrawnByJob(change) && (
      <AppText tone="muted" className="text-[12.5px] leading-[17px]">
        No empezó: tenía un pago atrasado.
      </AppText>
    )}
    {change.status === "withdrawn" && !wasWithdrawnByJob(change) && change.withdrawnAt && (
      <ChangeByLine prefix="Deshecha por" person={change.withdrawer} date={change.withdrawnAt} />
    )}
    {change.endedBy && change.endedAt && (
      <ChangeByLine prefix="Terminó antes por" person={change.ender} date={change.endedAt} />
    )}
  </View>
);

type MembershipHistoryProps = {
  /** The student's past changes (not the scheduled one nor the pause in progress), newest first. */
  changes: AdminMembershipChange[];
  courseTitle: (courseId: string) => string;
};

/** The history on the admin's view of a student: each past change and who made it. */
const MembershipHistory = ({ changes, courseTitle }: MembershipHistoryProps) => (
  <>
    {changes.map((change) => (
      <HistoryRow key={change.id} change={change} courseTitle={courseTitle} />
    ))}
  </>
);

export default MembershipHistory;
