import DataLoader from "@/components/DataLoader";
import CancelBlockedNotice from "@/components/membership/CancelBlockedNotice";
import CancelFacts from "@/components/membership/CancelFacts";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatDayMonth, monthlyFareFor } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { FormErrors, membershipChangeFormSchema, validationErrors } from "@/constants/validationForms";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import { paysComingMonth } from "@/hooks/membership/membershipRules";
import { MEMBERSHIP_ERROR_MESSAGES } from "@/hooks/membership/schema";
import { useMembershipChangePreview } from "@/hooks/membership/useMembershipChangePreview";
import { useRequestMembershipChange } from "@/hooks/membership/useRequestMembershipChange";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

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
              const isShifted = paysComingMonth(preview.paymentDate, preview.effectiveDate);
              return (
                <>
                  {!!preview.blockedReason && (
                    <Notice tone={preview.blockedReason === "PAYMENT_LATE" ? "late" : "neutral"} className="mx-3 mt-4">
                      {MEMBERSHIP_ERROR_MESSAGES[preview.blockedReason] ?? MEMBERSHIP_ERROR_MESSAGES.INVALID_CHANGE}
                    </Notice>
                  )}

                  <CancelFacts
                    effectiveDate={preview.effectiveDate}
                    paymentDate={preview.paymentDate}
                    monthlyFare={monthlyFareFor(faresQuery.data, myCourses.length)}
                  />

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
