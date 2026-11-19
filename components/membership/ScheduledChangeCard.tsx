import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import {
  daysBetween,
  formatCurrency,
  formatDayMonth,
  joinWithAnd,
  monthlyFareFor,
  planName,
} from "@/constants/helpers";
import type { Fare } from "@/hooks/fares/schema";
import { isMadeByAdmin, lastDayBefore } from "@/hooks/membership/membershipRules";
import type { MembershipChange } from "@/hooks/membership/schema";
import { useWithdrawMembershipChange } from "@/hooks/membership/useWithdrawMembershipChange";

type ScheduledChangeCardProps = {
  change: MembershipChange;
  /** The student's active courses (the ones leaving included). */
  courses: { courseId: string; title: string }[];
  fares: Fare[] | undefined;
};

/** The card's texts; `undo` says until when the student can undo it (left out for an admin's change). */
type CardTexts = { tag: string; title: string; text: string; undo: string };

/** A pause waiting for its date, or past it while a payment is in review (it starts once approved). */
const pauseTexts = (change: MembershipChange, lastDay: string): CardTexts => {
  const startsOn = formatDayMonth(change.effectiveDate);
  const endsOn = change.endDate ? formatDayMonth(change.endDate) : "";
  const isWaitingForPayment = daysBetween(new Date(), change.effectiveDate) <= 0;
  return {
    tag: "Pausa programada",
    title: `Pausa del ${startsOn} al ${endsOn}`,
    text: isWaitingForPayment
      ? "Empieza cuando la academia apruebe tu pago."
      : `No pagas mensualidad durante la pausa. Vuelves a pagar el ${endsOn}.`,
    undo: isWaitingForPayment ? "Puedes deshacerla mientras tanto." : `Puedes deshacerla hasta el ${lastDay}.`,
  };
};

/** A drop or cancel waiting for its date. */
const leavingTexts = (
  change: MembershipChange,
  courses: ScheduledChangeCardProps["courses"],
  fares: Fare[] | undefined,
  lastDay: string,
): CardTexts => {
  const startsOn = formatDayMonth(change.effectiveDate);
  if (change.kind === "cancel") {
    return {
      tag: "Cancelación programada",
      title: `Tu membresía termina el ${startsOn}`,
      text: `Sigues asistiendo hasta el ${lastDay}.`,
      undo: "Puedes deshacerlo hasta ese día.",
    };
  }
  const leaving = courses.filter((course) => change.courseIds.includes(course.courseId));
  const remainingCount = courses.length - leaving.length;
  return {
    tag: "Baja programada",
    title: `${joinWithAnd(leaving.map((course) => course.title))} ${leaving.length === 1 ? "sale" : "salen"} de tu plan el ${startsOn}`,
    text: `Desde esa fecha pasas a ${planName(remainingCount)} y pagas ${formatCurrency(
      monthlyFareFor(fares, remainingCount),
    )} al mes.`,
    undo: `Puedes deshacerlo hasta el ${lastDay}.`,
  };
};

/**
 * The drop, cancel or pause waiting for its date: what changes, from when, and
 * undoing it. A change an admin made can only be undone by an admin.
 */
const ScheduledChangeCard = ({ change, courses, fares }: ScheduledChangeCardProps) => {
  const withdraw = useWithdrawMembershipChange();

  const lastDay = formatDayMonth(lastDayBefore(change.effectiveDate));
  const texts = change.kind === "pause" ? pauseTexts(change, lastDay) : leavingTexts(change, courses, fares, lastDay);
  const isByAdmin = isMadeByAdmin(change);

  return (
    <Card className="mx-3 mt-4 gap-2">
      <Chip label={texts.tag} tone="pending" />
      <AppText variant="bold" className="text-[17px] leading-[22px]">
        {texts.title}
      </AppText>
      <AppText tone="muted" className="text-[13.5px] leading-[19px]">
        {isByAdmin ? texts.text : `${texts.text} ${texts.undo}`}
      </AppText>
      {isByAdmin ? (
        <AppText variant="semibold" className="mt-1 text-[13.5px]">
          La academia programó este cambio.
        </AppText>
      ) : (
        <Button
          label="Deshacer"
          variant="secondary"
          size="sm"
          className="mt-1 self-start"
          loading={withdraw.isPending}
          onPress={() => withdraw.mutate(change.id)}
        />
      )}
    </Card>
  );
};

export default ScheduledChangeCard;
