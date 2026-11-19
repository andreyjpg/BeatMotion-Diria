import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip, { type ChipTone } from "@/components/ui/Chip";
import { formatCurrency, formatDayMonth, formatShortDate, lateFeeFor, monthlyFareFor } from "@/constants/helpers";
import type { CourseSchemaWithMember } from "@/hooks/courses/schema/courseSchema";
import { useFares } from "@/hooks/fares/useFares";
import {
  activePauseOf,
  coursesContinuingOn,
  earliestPaymentDate,
  nextChargedDate,
  scheduledChangeOf,
} from "@/hooks/membership/membershipRules";
import type { MembershipChange } from "@/hooks/membership/schema";
import { useMembershipChanges } from "@/hooks/membership/useMembershipChanges";
import { useAnnualFeeDue } from "@/hooks/payment/useAnnualFeeDue";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import { useRouter } from "expo-router";
import { View } from "react-native";

type PaymentState = { label: string; tone: ChipTone; text: string };

/** "lun 30 oct". */
const shortDay = (date: Date) => formatShortDate(date).toLowerCase();

/** The chip and the line next to it: in review, late, pending or up to date. */
const paymentStateOf = (
  { inReview, isLate, owes }: { inReview: boolean; isLate: boolean; owes: boolean },
  dueDate: Date | null,
  change: MembershipChange | null,
): PaymentState => {
  if (inReview) return { label: "En revisión", tone: "pending", text: "Recibimos tu comprobante y lo estamos revisando." };
  if (isLate) return { label: "Atrasado", tone: "late", text: dueDate ? `Venció el ${shortDay(dueDate)}` : "Pago atrasado" };
  if (owes) return { label: "Pendiente", tone: "pending", text: dueDate ? `Vence el ${shortDay(dueDate)}` : "Pago pendiente" };
  if (change?.kind === "cancel") return { label: "Al día", tone: "ok", text: `Membresía termina el ${shortDay(change.effectiveDate)}` };
  const charged = nextChargedDate(dueDate, change);
  return { label: "Al día", tone: "ok", text: charged ? `Próximo pago el ${shortDay(charged)}` : "No debes nada" };
};

type PausedMonthProps = { pause: MembershipChange; dueDate: Date | null };

/** The card while paused and nothing is owed: no charges until the pause ends. */
const PausedMonth = ({ pause, dueDate }: PausedMonthProps) => {
  const nextPayment = dueDate ?? pause.endDate;
  return (
    <Card className="mx-3 gap-3">
      <View className="flex-row items-center gap-2">
        <Chip label="En pausa" tone="muted" />
        {nextPayment && (
          <AppText variant="label" tone="muted" className="flex-1 text-[10.5px]" numberOfLines={1}>
            {`Próximo pago ${formatDayMonth(nextPayment)}`}
          </AppText>
        )}
      </View>
      <View className="flex-row items-end justify-between gap-3">
        <View className="flex-1">
          <AppText variant="bold" className="text-[16px]">
            Sin cobros durante la pausa
          </AppText>
          {pause.endDate && (
            <AppText tone="muted" className="mt-0.5 text-[13.5px]" numberOfLines={1}>
              {`Del ${formatDayMonth(pause.effectiveDate)} al ${formatDayMonth(pause.endDate)}`}
            </AppText>
          )}
        </View>
        <AppText variant="heavy" className="text-[24px]">
          {formatCurrency(0)}
        </AppText>
      </View>
    </Card>
  );
};

type MonthlyFeeCardProps = {
  userId: string;
  /** The student's active courses (useCoursesByUserMember). */
  courses: CourseSchemaWithMember[];
};

/**
 * "Mensualidad" on the student's home: this month's standing and amount, the
 * same total as Pagos (monthly fare + late fee + annual fee when due) for the
 * courses that still pay that due date. While paused and owing nothing, no
 * charges until the pause ends.
 */
const MonthlyFeeCard = ({ userId, courses }: MonthlyFeeCardProps) => {
  const router = useRouter();
  const changesQuery = useMembershipChanges(userId);
  const paymentsQuery = usePaymentsByUser(userId);
  const annualFeeQuery = useAnnualFeeDue(userId);
  const faresQuery = useFares();

  const change = scheduledChangeOf(changesQuery.data);
  const activePause = activePauseOf(changesQuery.data);
  const dueDate = earliestPaymentDate(courses);
  const payingCourses = coursesContinuingOn(courses, change, dueDate);
  const monthCourses = payingCourses.length > 0 ? payingCourses : courses;
  const owes = payingCourses.some((course) => course.paymentStatus !== "ok");
  const isLate = courses.some((course) => course.paymentStatus === "late");
  const inReview = paymentsQuery.data?.some((payment) => payment.status === "pending") ?? false;

  // In the last 10 days of a pause the month is owed again: the usual card, to pay ahead.
  if (activePause && !owes && !inReview) return <PausedMonth pause={activePause} dueDate={dueDate} />;

  const annualFare = faresQuery.data?.find((fare) => fare.type === "annual")?.fare ?? 0;
  const total =
    monthlyFareFor(faresQuery.data, payingCourses.length) +
    lateFeeFor(faresQuery.data, dueDate).amount +
    (annualFeeQuery.data ? annualFare : 0);
  const payment = paymentStateOf({ inReview, isLate, owes }, dueDate, change);
  const mustPay = owes && !inReview;

  return (
    <Card className="mx-3 gap-3">
      <View className="flex-row items-center gap-2">
        <Chip label={payment.label} tone={payment.tone} />
        <AppText variant="label" tone="muted" className="flex-1 text-[10.5px]" numberOfLines={1}>
          {payment.text}
        </AppText>
      </View>
      <View className="flex-row items-end justify-between gap-3">
        <View className="flex-1">
          <AppText variant="bold" className="text-[16px]">
            {monthCourses.length === 1 ? "1 curso este mes" : `${monthCourses.length} cursos este mes`}
          </AppText>
          <AppText tone="muted" className="mt-0.5 text-[13.5px]" numberOfLines={1}>
            {monthCourses.map((course) => course.title).join(" + ")}
          </AppText>
        </View>
        {mustPay && faresQuery.isSuccess && (
          <AppText variant="heavy" className="text-[24px]">
            {formatCurrency(total)}
          </AppText>
        )}
      </View>
      <Button
        label={mustPay ? "Pagar mensualidad" : "Ver mis pagos"}
        variant={mustPay ? "primary" : "secondary"}
        onPress={() => router.navigate("/private/payments")}
      />
    </Card>
  );
};

export default MonthlyFeeCard;
