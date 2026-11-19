import DataLoader from "@/components/DataLoader";
import CancelBlockedNotice from "@/components/membership/CancelBlockedNotice";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import type { IconName } from "@/components/ui/IconButton";
import Notice from "@/components/ui/Notice";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatCurrency, formatDayMonth, monthlyFareFor } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { FormErrors, membershipChangeFormSchema, validationErrors } from "@/constants/validationForms";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import { lastDayBefore, paysComingMonth } from "@/hooks/membership/membershipRules";
import { MEMBERSHIP_ERROR_MESSAGES, type MembershipChangePreview } from "@/hooks/membership/schema";
import { useMembershipChangePreview } from "@/hooks/membership/useMembershipChangePreview";
import { useRequestMembershipChange } from "@/hooks/membership/useRequestMembershipChange";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

type Fact = { icon: IconName; text: string };

/** What canceling means for this student, from the dates the database gave. */
const cancelFacts = (preview: MembershipChangePreview, monthlyFare: number): Fact[] => {
  if (!preview.effectiveDate) return [];
  const startsOn = formatDayMonth(preview.effectiveDate);
  const payment =
    preview.paymentDate && paysComingMonth(preview.paymentDate, preview.effectiveDate)
      ? `Pagas la mensualidad del ${formatDayMonth(preview.paymentDate)} (${formatCurrency(
          monthlyFare,
        )}). No te cobramos la del ${startsOn}.`
      : `No te cobramos la mensualidad del ${startsOn}.`;
  return [
    { icon: "calendar-outline", text: `Sigues asistiendo hasta el ${formatDayMonth(lastDayBefore(preview.effectiveDate))}.` },
    { icon: "card-outline", text: payment },
    { icon: "notifications-outline", text: `Desde el ${startsOn} no recibes recordatorios de pago.` },
    { icon: "refresh-outline", text: "Tu cuenta sigue activa. Para volver, haces una matrícula nueva." },
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

/** "¿Solo necesitas un descanso?": pausing instead of canceling. */
const BreakCard = ({ onPress }: { onPress: () => void }) => (
  <Card
    onPress={onPress}
    accessibilityLabel="¿Solo necesitas un descanso? Pausa de 1 a 3 meses sin perder tus cursos."
    padded={false}
    className="mx-3 mt-2.5 flex-row items-center gap-3 px-4 py-3.5"
  >
    <View className="h-10 w-10 items-center justify-center rounded-xl bg-sand">
      <Ionicons name="pause-circle-outline" size={20} color={palette.ink} />
    </View>
    <View className="flex-1 gap-0.5">
      <AppText variant="bold" className="text-[15px]">
        ¿Solo necesitas un descanso?
      </AppText>
      <AppText tone="muted" className="text-[12.5px]">
        Pausa de 1 a 3 meses sin perder tus cursos.
      </AppText>
    </View>
    <Ionicons name="chevron-forward" size={20} color={palette.ink} />
  </Card>
);

/** "Cancelar membresía": the student leaves every course, from a payment date. */
const CancelMembershipScreen = () => {
  const router = useRouter();
  // The reason written on "Dar de baja un curso" when every course was picked.
  const params = useLocalSearchParams<{ reason?: string }>();
  const { user } = useActiveUser();
  const userId = user?.uid ?? "";
  const coursesQuery = useCoursesByUserMember(userId);
  const previewQuery = useMembershipChangePreview(userId);
  const faresQuery = useFares();
  const requestChange = useRequestMembershipChange();

  const [reason, setReason] = useState(params.reason ?? "");
  const [errors, setErrors] = useState<FormErrors<typeof membershipChangeFormSchema>>({});

  const courseCount = coursesQuery.data?.length ?? 0;
  const blockedReason = previewQuery.data?.blockedReason ?? null;
  const cancelBlockedReason = previewQuery.data?.cancelBlockedReason ?? null;
  const isBlocked = !previewQuery.isSuccess || blockedReason !== null || cancelBlockedReason !== null;
  const lead = `Dejas ${courseCount === 1 ? "tu curso" : `tus ${courseCount} cursos`}. Puedes volver a matricularte cuando quieras.`;

  const handleCancel = async () => {
    const found = validationErrors(membershipChangeFormSchema, { reason });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await requestChange.mutateAsync({ kind: "cancel", courseIds: [], reason });
      router.back();
    } catch {
      // useRequestMembershipChange already told the student what went wrong.
    }
  };

  return (
    <Screen
      form
      footer={
        <Button
          label="Cancelar membresía"
          variant="danger"
          disabled={isBlocked || courseCount === 0}
          loading={requestChange.isPending}
          onPress={handleCancel}
        />
      }
    >
      <ScreenHeader eyebrow="Mi membresía" title="Cancelar membresía" subtitle={courseCount > 0 ? lead : undefined} />
      <DataLoader query={previewQuery}>
        {(preview) => (
          <DataLoader query={coursesQuery} emptyMessage="No tienes cursos activos.">
            {(myCourses) => {
              const monthlyFare = monthlyFareFor(faresQuery.data, myCourses.length);
              const facts = cancelFacts(preview, monthlyFare);
              const isShifted = paysComingMonth(preview.paymentDate, preview.effectiveDate);
              return (
                <>
                  {!!preview.blockedReason && (
                    <Notice tone={preview.blockedReason === "PAYMENT_LATE" ? "late" : "neutral"} className="mx-3 mt-4">
                      {MEMBERSHIP_ERROR_MESSAGES[preview.blockedReason] ?? MEMBERSHIP_ERROR_MESSAGES.INVALID_CHANGE}
                    </Notice>
                  )}

                  <Card padded={false} className="mx-3 mt-4 px-4 py-1.5">
                    {facts.map((fact, index) => (
                      <FactRow key={fact.icon} fact={fact} divider={index < facts.length - 1} />
                    ))}
                  </Card>

                  {isShifted && preview.paymentDate && preview.effectiveDate && (
                    <Notice tone="pending" className="mx-3 mt-2.5">
                      {`Faltan menos de 8 días para tu pago del ${formatDayMonth(
                        preview.paymentDate,
                      )}: ese mes lo pagas y la cancelación empieza el ${formatDayMonth(preview.effectiveDate)}.`}
                    </Notice>
                  )}

                  {!!preview.cancelBlockedReason && (
                    <CancelBlockedNotice reason={preview.cancelBlockedReason} className="mx-3 mt-2.5" />
                  )}

                  <BreakCard onPress={() => router.replace("/private/user/membership/pause")} />

                  <View className="px-5 pt-5">
                    <Field
                      label="Motivo (opcional)"
                      value={reason}
                      onChangeText={setReason}
                      placeholder="Cuéntanos por qué"
                      multiline
                      error={errors.reason}
                    />
                  </View>
                </>
              );
            }}
          </DataLoader>
        )}
      </DataLoader>
    </Screen>
  );
};

export default CancelMembershipScreen;
