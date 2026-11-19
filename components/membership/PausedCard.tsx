import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { formatCurrency, formatDayMonth } from "@/constants/helpers";
import type { MembershipChange } from "@/hooks/membership/schema";
import { useEndPause } from "@/hooks/membership/useEndPause";
import { Alert } from "react-native";

type PausedCardProps = {
  /** The pause in progress (activePauseOf). */
  pause: MembershipChange;
  courseCount: number;
  monthlyFare: number;
  /** The student's earliest due date: past the pause's end when they already paid ahead. */
  dueDate: Date | null;
};

/** What "Volver antes" means today, for the confirmation. */
const backTodayMessage = ({ pause, courseCount, monthlyFare, dueDate }: PausedCardProps) => {
  const courses = courseCount === 1 ? "Tu curso vuelve" : `Tus ${courseCount} cursos vuelven`;
  const isPaidAhead = !!dueDate && !!pause.endDate && dueDate.getTime() > pause.endDate.getTime();
  const payment = isPaidAhead
    ? `${courses} hoy. Tu próxima mensualidad ya está pagada.`
    : `${courses} hoy y tu mensualidad de ${formatCurrency(monthlyFare)} vence hoy.`;
  return `${payment} Esta pausa sigue contando como tu pausa de ${pause.effectiveDate.getFullYear()}.`;
};

/** The pause in progress on Mi membresía: until when, and coming back today ("Volver antes"). */
const PausedCard = (props: PausedCardProps) => {
  const endPause = useEndPause();
  const { pause } = props;

  const handleBackEarly = () => {
    Alert.alert("¿Volver hoy?", backTodayMessage(props), [
      { text: "No", style: "cancel" },
      { text: "Sí, volver hoy", onPress: () => endPause.mutate() },
    ]);
  };

  return (
    <Card className="mx-3 mt-4 gap-2">
      <Chip label="En pausa" tone="muted" />
      <AppText variant="bold" className="text-[17px] leading-[22px]">
        {pause.endDate ? `En pausa hasta el ${formatDayMonth(pause.endDate)}` : "En pausa"}
      </AppText>
      <AppText tone="muted" className="text-[13.5px] leading-[19px]">
        Tus cursos te esperan. Si vuelves antes, tus cursos vuelven ese día y la mensualidad vence ese mismo día.
      </AppText>
      <Button
        label="Volver antes"
        variant="secondary"
        size="sm"
        className="mt-1 self-start"
        loading={endPause.isPending}
        onPress={handleBackEarly}
      />
    </Card>
  );
};

export default PausedCard;
