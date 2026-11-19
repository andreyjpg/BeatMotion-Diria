import DataLoader from "@/components/DataLoader";
import CancelBlockedNotice from "@/components/membership/CancelBlockedNotice";
import MembershipCourseList from "@/components/membership/MembershipCourseList";
import PausedCard from "@/components/membership/PausedCard";
import ScheduledChangeCard from "@/components/membership/ScheduledChangeCard";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { IconName } from "@/components/ui/IconButton";
import InfoRow from "@/components/ui/InfoRow";
import Notice from "@/components/ui/Notice";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { formatCurrency, formatDayMonth, monthlyFareFor, planName, plural } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import {
  activePauseOf,
  coursesContinuingOn,
  earliestPaymentDate,
  nextChargedDate,
  scheduledChangeOf,
} from "@/hooks/membership/membershipRules";
import { MEMBERSHIP_ERROR_MESSAGES } from "@/hooks/membership/schema";
import { useMembershipChangePreview } from "@/hooks/membership/useMembershipChangePreview";
import { useMembershipChanges } from "@/hooks/membership/useMembershipChanges";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Pressable, RefreshControl, View } from "react-native";

/** Options the student can't use now are shown faded. */
const DISABLED_OPACITY = 0.45;

/** Why every option is off, under the options. */
const BLOCKED_TEXT: Record<string, string> = {
  PAYMENT_LATE: "Ponte al día con tu pago para hacer cambios. Un pago en revisión no los bloquea.",
  CHANGE_PENDING: "Solo puedes tener un cambio programado a la vez. Deshazlo para elegir otro.",
  MEMBERSHIP_PAUSED: "Termina la pausa para hacer otros cambios.",
};

const PREVIEW_ERROR_TEXT = "No se pudo revisar si puedes hacer cambios. Desliza hacia abajo para intentar de nuevo.";

/** The note under the options when none of them can be used; null when they can. */
const blockedTextFor = (previewFailed: boolean, blockedReason: string | null) => {
  if (previewFailed) return PREVIEW_ERROR_TEXT;
  if (!blockedReason) return null;
  return BLOCKED_TEXT[blockedReason] ?? MEMBERSHIP_ERROR_MESSAGES[blockedReason] ?? null;
};

/** "Próximo pago" in the summary: overdue, not charged (everything leaves first) or the date. */
const nextPaymentLabel = (dueDate: Date | null, isLate: boolean, isCharged: boolean) => {
  if (!dueDate) return "—";
  if (isLate) return `Vencido el ${formatDayMonth(dueDate)}`;
  return isCharged ? formatDayMonth(dueDate) : "Sin cobro";
};

type ChangeOption = {
  title: string;
  sub: string;
  icon: IconName;
  route: Href;
  isDestructive: boolean;
  isDisabled: boolean;
};

type OptionRowProps = { option: ChangeOption; divider: boolean; onPress: () => void };

/** One row of "Cambios". */
const OptionRow = ({ option, divider, onPress }: OptionRowProps) => (
  <Pressable
    onPress={onPress}
    disabled={option.isDisabled}
    accessibilityRole="button"
    accessibilityState={{ disabled: option.isDisabled }}
    accessibilityLabel={`${option.title}. ${option.sub}`}
    className={`flex-row items-center gap-3 py-3.5 ${divider ? "border-b border-line-soft" : ""}`}
    style={{ opacity: option.isDisabled ? DISABLED_OPACITY : 1 }}
  >
    <View
      className={`h-9 w-9 items-center justify-center rounded-[10px] ${option.isDestructive ? "bg-danger-soft" : "bg-sand"}`}
    >
      <Ionicons name={option.icon} size={20} color={option.isDestructive ? palette.danger.DEFAULT : palette.ink} />
    </View>
    <View className="flex-1 gap-0.5">
      <AppText variant="bold" tone={option.isDestructive ? "danger" : "ink"} className="text-[15px]">
        {option.title}
      </AppText>
      <AppText tone="muted" className="text-[12.5px]">
        {option.sub}
      </AppText>
    </View>
    {!option.isDisabled && <Ionicons name="chevron-forward" size={20} color={palette.ink} />}
  </Pressable>
);

/** "Mi membresía": the student's plan and courses, a scheduled change or a pause, and dropping, pausing or canceling. */
const MembershipScreen = () => {
  const router = useRouter();
  const { user } = useActiveUser();
  const userId = user?.uid ?? "";
  const coursesQuery = useCoursesByUserMember(userId);
  const changesQuery = useMembershipChanges(userId);
  const previewQuery = useMembershipChangePreview(userId);
  const faresQuery = useFares();
  const branchesQuery = useBranches();

  const change = scheduledChangeOf(changesQuery.data);
  const activePause = activePauseOf(changesQuery.data);
  const blockedReason = previewQuery.data?.blockedReason ?? null;
  const cancelBlockedReason = previewQuery.data?.cancelBlockedReason ?? null;
  // Until the database says the student can, no option opens.
  const isBlocked = !previewQuery.isSuccess || blockedReason !== null;
  const blockedText = blockedTextFor(previewQuery.isError, blockedReason);

  const options: ChangeOption[] = [
    {
      title: "Dar de baja un curso",
      sub: "Sigues en los demás cursos",
      icon: "remove-circle-outline",
      route: "/private/user/membership/drop",
      isDestructive: false,
      isDisabled: isBlocked,
    },
    {
      title: "Pausar membresía",
      sub: "De 1 a 3 meses · gratis · una vez al año",
      icon: "pause-circle-outline",
      route: "/private/user/membership/pause",
      isDestructive: false,
      // A pause blocked only by its own rules (the yearly limit, an enrollment
      // in review) still opens: its screen says why and when it can be asked.
      isDisabled: isBlocked,
    },
    {
      title: "Cancelar membresía",
      sub: "Dejas todos tus cursos",
      icon: "log-out-outline",
      route: "/private/user/membership/cancel",
      isDestructive: true,
      isDisabled: isBlocked || cancelBlockedReason !== null,
    },
  ];

  const branchName = (branchId: string | null | undefined) =>
    branchesQuery.data?.find((branch) => branch.id === branchId)?.name;

  const refresh = () => {
    coursesQuery.refetch();
    changesQuery.refetch();
    previewQuery.refetch();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={coursesQuery.isRefetching} onRefresh={refresh} />}>
      <ScreenHeader eyebrow="Pagos" title="Mi membresía" subtitle="Los cambios empiezan en tu día de pago." />
      <DataLoader query={coursesQuery} emptyMessage="No tienes cursos activos.">
        {(courses) => {
          const dueDate = earliestPaymentDate(courses);
          const isLate = courses.some((course) => course.paymentStatus === "late");
          const isCharged = coursesContinuingOn(courses, change, dueDate).length > 0;
          const monthlyFare = monthlyFareFor(faresQuery.data, courses.length);
          return (
            <>
              {blockedReason === "PAYMENT_LATE" && (
                <Notice
                  tone="late"
                  icon="alert-circle-outline"
                  className="mx-3 mt-4"
                  action={<Button label="Ir a pagar" onPress={() => router.navigate("/private/payments")} />}
                >
                  Tienes un pago atrasado. Ponte al día para hacer cambios.
                </Notice>
              )}

              {change && <ScheduledChangeCard change={change} courses={courses} fares={faresQuery.data} />}
              {activePause && (
                <PausedCard
                  pause={activePause}
                  courseCount={courses.length}
                  monthlyFare={monthlyFare}
                  dueDate={dueDate}
                />
              )}

              <Card padded={false} className="mx-3 mt-3 px-4 py-1">
                <InfoRow label="Plan">{`${planName(courses.length)} · ${plural(courses.length, "curso", "cursos")}`}</InfoRow>
                <InfoRow label="Mensualidad">{formatCurrency(monthlyFare)}</InfoRow>
                <InfoRow label="Próximo pago" divider={false}>
                  {nextPaymentLabel(nextChargedDate(dueDate, change), isLate, isCharged)}
                </InfoRow>
              </Card>

              <SectionHeader title="Tus cursos" />
              <MembershipCourseList courses={courses} change={change} branchName={branchName} />

              <SectionHeader title="Cambios" />
              <Card padded={false} className="mx-3 px-4">
                {options.map((option, index) => (
                  <OptionRow
                    key={option.title}
                    option={option}
                    divider={index < options.length - 1}
                    onPress={() => router.push(option.route)}
                  />
                ))}
              </Card>
              {!!blockedText && (
                <AppText tone="muted" className="mx-6 mt-2 text-[12.5px] leading-[17px]">
                  {blockedText}
                </AppText>
              )}
              {!blockedText && !!cancelBlockedReason && (
                <CancelBlockedNotice reason={cancelBlockedReason} className="mx-3 mt-2.5" />
              )}
            </>
          );
        }}
      </DataLoader>
    </Screen>
  );
};

export default MembershipScreen;
