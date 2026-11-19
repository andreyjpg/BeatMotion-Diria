import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatDayMonth, joinWithAnd } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { appliesToday, currentChangeOf, liveChangeOf } from "@/hooks/membership/membershipRules";
import type { AdminMembershipChange, AdminMembershipChangePreview } from "@/hooks/membership/schema";
import { useAdminEndPause } from "@/hooks/membership/useAdminEndPause";
import { useAdminMembershipChangePreview } from "@/hooks/membership/useAdminMembershipChangePreview";
import { useAdminWithdrawMembershipChange } from "@/hooks/membership/useAdminWithdrawMembershipChange";
import { useMembershipChangesByUser } from "@/hooks/membership/useMembershipChangesByUser";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Alert, Pressable, View } from "react-native";
import ChangeByLine from "./ChangeByLine";
import MembershipChangeChip from "./MembershipChangeChip";
import MembershipHistory from "./MembershipHistory";

/** Actions the admin can't use now are shown faded. */
const DISABLED_OPACITY = 0.45;

/** "En pausa del 30 oct al 30 ene", "Salsa sale del plan el 30 oct"… */
const currentTitleOf = (change: AdminMembershipChange, courseTitle: (courseId: string) => string) => {
  const startsOn = formatDayMonth(change.effectiveDate);
  const endsOn = change.endDate ? formatDayMonth(change.endDate) : "";
  if (change.kind === "pause") {
    return change.status === "applied" ? `En pausa del ${startsOn} al ${endsOn}` : `Pausa del ${startsOn} al ${endsOn}`;
  }
  if (change.kind === "cancel") return `La membresía termina el ${startsOn}`;
  const titles = change.courseIds.map(courseTitle);
  return `${joinWithAnd(titles)} ${titles.length === 1 ? "sale" : "salen"} del plan el ${startsOn}`;
};

/** The line under the options: what the admin can do now, and the rules they skip. */
const noteOf = (
  current: AdminMembershipChange | null,
  preview: AdminMembershipChangePreview,
  studentName: string,
) => {
  if (current?.status === "applied") {
    return `Terminar la pausa hoy devuelve los cursos hoy y la mensualidad vence hoy. ${studentName} recibe un aviso.`;
  }
  if (current) return "Deshaz el cambio programado para hacer otro.";
  if (preview.blockedReason === "NOT_MEMBER") return "No tiene cursos activos: no hay cambios que hacer.";
  if (preview.cancelBlockedReason) return "Tiene una matrícula en revisión: revísala antes de pausar o cancelar.";
  const startsOn = appliesToday(preview.effectiveDate)
    ? "Empiezan hoy, porque su día de pago ya llegó."
    : `Empiezan el próximo día de pago${preview.effectiveDate ? ` (${formatDayMonth(preview.effectiveDate)})` : ""}, o hoy si ya pasó.`;
  return `Como admin, los cambios no siguen la regla de 8 días, el límite de una pausa por año ni el bloqueo por atraso. ${startsOn}`;
};

type MembershipAction = { title: string; route?: Href; onPress?: () => void; isDestructive: boolean; isDisabled: boolean };

type ActionRowProps = { action: MembershipAction; divider: boolean; onNavigate: (route: Href) => void };

/** One action of the card: opens its screen, or asks before ending the pause. */
const ActionRow = ({ action, divider, onNavigate }: ActionRowProps) => (
  <Pressable
    onPress={() => (action.route ? onNavigate(action.route) : action.onPress?.())}
    disabled={action.isDisabled}
    accessibilityRole="button"
    accessibilityState={{ disabled: action.isDisabled }}
    className={`min-h-[48px] flex-row items-center gap-3 py-3 ${divider ? "border-b border-line-soft" : ""}`}
    style={{ opacity: action.isDisabled ? DISABLED_OPACITY : 1 }}
  >
    <AppText variant="bold" tone={action.isDestructive ? "danger" : "ink"} className="flex-1 text-[15px]">
      {action.title}
    </AppText>
    {!action.isDisabled && <Ionicons name="chevron-forward" size={20} color={palette.ink} />}
  </Pressable>
);

type StudentMembershipCardProps = {
  userId: string;
  /** The student's first name, for the texts. */
  studentName: string;
  /** A course's title from its id (dropped courses aren't among the student's courses anymore). */
  courseTitle: (courseId: string) => string;
};

/**
 * "Membresía" on the admin's view of a student: the change in progress (with
 * "Deshacer"), the history with who made each change, and pausing, dropping,
 * canceling or ending the pause today.
 */
const StudentMembershipCard = ({ userId, studentName, courseTitle }: StudentMembershipCardProps) => {
  const router = useRouter();
  const changesQuery = useMembershipChangesByUser(userId);
  const previewQuery = useAdminMembershipChangePreview(userId);
  const withdraw = useAdminWithdrawMembershipChange();
  const endPause = useAdminEndPause();

  const changes = changesQuery.data ?? [];
  const current = currentChangeOf(changesQuery.data);
  const liveChange = liveChangeOf(current);
  const past = changes.filter((change) => change.id !== current?.id);

  const confirmUndo = (change: AdminMembershipChange) => {
    Alert.alert("¿Deshacer este cambio?", `Sus cursos y sus pagos siguen como antes. ${studentName} recibe un aviso.`, [
      { text: "No", style: "cancel" },
      { text: "Sí, deshacer", onPress: () => withdraw.mutate(change.id) },
    ]);
  };

  const confirmEndPause = () => {
    Alert.alert(
      "¿Terminar la pausa hoy?",
      `Los cursos de ${studentName} vuelven hoy y su mensualidad vence hoy. ${studentName} recibe un aviso.`,
      [
        { text: "No", style: "cancel" },
        { text: "Sí, terminar hoy", onPress: () => endPause.mutate(userId) },
      ],
    );
  };

  return (
    <Card padded={false} className="mx-3 mt-2.5 px-4 pb-1 pt-3">
      <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
        Membresía
      </AppText>
      <DataLoader query={previewQuery}>
        {(preview) => {
          const isPaused = current?.status === "applied";
          const isBlocked = preview.blockedReason !== null;
          const coversAllBlocked = isBlocked || preview.cancelBlockedReason !== null;
          const actions: MembershipAction[] = isPaused
            ? [{ title: "Terminar pausa hoy", onPress: confirmEndPause, isDestructive: false, isDisabled: endPause.isPending }]
            : [
                {
                  title: "Pausar membresía",
                  route: { pathname: "/private/admin/membership/[uid]/pause", params: { uid: userId } },
                  isDestructive: false,
                  isDisabled: coversAllBlocked,
                },
                {
                  title: "Dar de baja cursos",
                  route: { pathname: "/private/admin/membership/[uid]/drop", params: { uid: userId } },
                  isDestructive: false,
                  isDisabled: isBlocked,
                },
                {
                  title: "Cancelar membresía",
                  route: { pathname: "/private/admin/membership/[uid]/cancel", params: { uid: userId } },
                  isDestructive: true,
                  isDisabled: coversAllBlocked,
                },
              ];
          return (
            <>
              {current && liveChange && (
                <View className="gap-1 border-b border-line-soft py-3">
                  <View className="flex-row items-center justify-between gap-2">
                    <MembershipChangeChip change={liveChange} />
                    <AppText variant="label" tone="muted" className="text-[10px]">
                      {isPaused && current.endDate ? `Hasta el ${formatDayMonth(current.endDate)}` : "Programado"}
                    </AppText>
                  </View>
                  <AppText variant="bold" className="text-[15px]">
                    {currentTitleOf(current, courseTitle)}
                  </AppText>
                  <ChangeByLine prefix="Por" person={current.creator} date={current.createdAt} reason={current.reason} />
                  {!isPaused && (
                    <Button
                      label="Deshacer"
                      variant="secondary"
                      size="sm"
                      className="mt-1 self-start"
                      loading={withdraw.isPending}
                      onPress={() => confirmUndo(current)}
                    />
                  )}
                </View>
              )}

              {changesQuery.isLoading && (
                <AppText tone="muted" className="py-3 text-[12.5px]">
                  Cargando el historial…
                </AppText>
              )}
              {changesQuery.isError && (
                <AppText tone="muted" className="py-3 text-[12.5px]">
                  No se pudo cargar el historial. Desliza hacia abajo para intentar de nuevo.
                </AppText>
              )}
              <MembershipHistory changes={past} courseTitle={courseTitle} />

              {actions.map((action, index) => (
                <ActionRow
                  key={action.title}
                  action={action}
                  divider={index < actions.length - 1}
                  onNavigate={(route) => router.push(route)}
                />
              ))}
              <AppText tone="muted" className="pb-2.5 pt-1.5 text-[12.5px] leading-[17px]">
                {noteOf(current, preview, studentName)}
              </AppText>
            </>
          );
        }}
      </DataLoader>
    </Card>
  );
};

export default StudentMembershipCard;
