import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import type { IconName } from "@/components/ui/IconButton";
import { formatCurrency, formatDayMonth } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { appliesToday, lastDayBefore, paysComingMonth } from "@/hooks/membership/membershipRules";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

type Fact = { icon: IconName; text: string };

type CancelFactsProps = {
  /** When the cancel starts (the preview's effective date). */
  effectiveDate: Date | null;
  /** The coming payment date: when it's before the start, the student pays it first. */
  paymentDate: Date | null;
  monthlyFare: number;
  /** For an admin: the student's name, so the facts speak about them. */
  studentName?: string;
};

/** What canceling means for the student, in their words. */
const studentFacts = ({ effectiveDate, paymentDate, monthlyFare }: CancelFactsProps): Fact[] => {
  if (!effectiveDate) return [];
  const startsOn = formatDayMonth(effectiveDate);
  const payment =
    paymentDate && paysComingMonth(paymentDate, effectiveDate)
      ? `Pagas la mensualidad del ${formatDayMonth(paymentDate)} (${formatCurrency(monthlyFare)}). No te cobramos la del ${startsOn}.`
      : `No te cobramos la mensualidad del ${startsOn}.`;
  return [
    { icon: "calendar-outline", text: `Sigues asistiendo hasta el ${formatDayMonth(lastDayBefore(effectiveDate))}.` },
    { icon: "card-outline", text: payment },
    { icon: "notifications-outline", text: `Desde el ${startsOn} no recibes recordatorios de pago.` },
    { icon: "refresh-outline", text: "Tu cuenta sigue activa. Para volver, haces una matrícula nueva." },
  ];
};

/** What an admin's cancel means for the student (no 8-day notice: from the payment date, or today). */
const adminFacts = (effectiveDate: Date | null, studentName: string): Fact[] => {
  if (!effectiveDate) return [];
  const comeBack: Fact = { icon: "refresh-outline", text: "Su cuenta sigue activa. Para volver, hace una matrícula nueva." };
  if (appliesToday(effectiveDate)) {
    return [
      { icon: "calendar-outline", text: `${studentName} deja sus cursos hoy.` },
      { icon: "notifications-outline", text: "Desde hoy no recibe recordatorios de pago." },
      comeBack,
    ];
  }
  const startsOn = formatDayMonth(effectiveDate);
  return [
    { icon: "calendar-outline", text: `${studentName} sigue asistiendo hasta el ${formatDayMonth(lastDayBefore(effectiveDate))}.` },
    { icon: "card-outline", text: `No se le cobra la mensualidad del ${startsOn}.` },
    { icon: "notifications-outline", text: `Desde el ${startsOn} no recibe recordatorios de pago.` },
    comeBack,
  ];
};

/** One line of the facts card. */
const FactRow = ({ fact, divider }: { fact: Fact; divider: boolean }) => (
  <View className={`flex-row items-start gap-3 py-3 ${divider ? "border-b border-line-soft" : ""}`}>
    <View className="h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-sand">
      <Ionicons name={fact.icon} size={18} color={palette.ink} />
    </View>
    <AppText className="flex-1 pt-1.5 text-[14.5px] leading-[20px]">{fact.text}</AppText>
  </View>
);

/** What canceling the membership means: until when, which payment isn't charged, how to come back. */
const CancelFacts = (props: CancelFactsProps) => {
  const facts = props.studentName ? adminFacts(props.effectiveDate, props.studentName) : studentFacts(props);
  return (
    <Card padded={false} className="mx-3 mt-4 px-4 py-1.5">
      {facts.map((fact, index) => (
        <FactRow key={fact.icon} fact={fact} divider={index < facts.length - 1} />
      ))}
    </Card>
  );
};

export default CancelFacts;
