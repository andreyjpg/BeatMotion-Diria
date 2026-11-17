import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { formatCurrency, formatDayMonth, joinWithAnd, monthlyFareFor, planName } from "@/constants/helpers";
import type { Fare } from "@/hooks/fares/schema";
import { lastDayBefore } from "@/hooks/membership/membershipRules";
import type { MembershipChange } from "@/hooks/membership/schema";
import { useWithdrawMembershipChange } from "@/hooks/membership/useWithdrawMembershipChange";

type ScheduledChangeCardProps = {
  change: MembershipChange;
  /** The student's active courses (the ones leaving included). */
  courses: { courseId: string; title: string }[];
  fares: Fare[] | undefined;
};

/** The drop or cancel waiting for its date: what changes, from when, and undoing it. */
const ScheduledChangeCard = ({ change, courses, fares }: ScheduledChangeCardProps) => {
  const withdraw = useWithdrawMembershipChange();

  const startsOn = formatDayMonth(change.effectiveDate);
  const lastDay = formatDayMonth(lastDayBefore(change.effectiveDate));
  const isCancel = change.kind === "cancel";
  const leaving = courses.filter((course) => change.courseIds.includes(course.courseId));
  const remainingCount = courses.length - leaving.length;

  const title = isCancel
    ? `Tu membresía termina el ${startsOn}`
    : `${joinWithAnd(leaving.map((course) => course.title))} ${leaving.length === 1 ? "sale" : "salen"} de tu plan el ${startsOn}`;
  const text = isCancel
    ? `Sigues asistiendo hasta el ${lastDay}. Puedes deshacerlo hasta ese día.`
    : `Desde esa fecha pasas a ${planName(remainingCount)} y pagas ${formatCurrency(
        monthlyFareFor(fares, remainingCount),
      )} al mes. Puedes deshacerlo hasta el ${lastDay}.`;

  return (
    <Card className="mx-3 mt-4 gap-2">
      <Chip label={isCancel ? "Cancelación programada" : "Baja programada"} tone="pending" />
      <AppText variant="bold" className="text-[17px] leading-[22px]">
        {title}
      </AppText>
      <AppText tone="muted" className="text-[13.5px] leading-[19px]">
        {text}
      </AppText>
      <Button
        label="Deshacer"
        variant="secondary"
        size="sm"
        className="mt-1 self-start"
        loading={withdraw.isPending}
        onPress={() => withdraw.mutate(change.id)}
      />
    </Card>
  );
};

export default ScheduledChangeCard;
