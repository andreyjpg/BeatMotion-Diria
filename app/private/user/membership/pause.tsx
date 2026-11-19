import DataLoader from "@/components/DataLoader";
import CancelBlockedNotice from "@/components/membership/CancelBlockedNotice";
import PauseForm, { pauseMonthsLabel } from "@/components/membership/PauseForm";
import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatDayMonth, formatDayMonthYear, monthlyFareFor } from "@/constants/helpers";
import { type FormErrors, pauseFormSchema, validationErrors } from "@/constants/validationForms";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import { paysComingMonth } from "@/hooks/membership/membershipRules";
import { MEMBERSHIP_ERROR_MESSAGES, type PauseMonths } from "@/hooks/membership/schema";
import { useMembershipChangePreview } from "@/hooks/membership/useMembershipChangePreview";
import { useRequestMembershipChange } from "@/hooks/membership/useRequestMembershipChange";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import { useState } from "react";

/** "Pausar membresía": the student picks 1, 2 or 3 months and sees when it starts and ends. */
const PauseMembershipScreen = () => {
  const router = useRouter();
  const { user } = useActiveUser();
  const userId = user?.uid ?? "";
  const coursesQuery = useCoursesByUserMember(userId);
  const previewQuery = useMembershipChangePreview(userId);
  const faresQuery = useFares();
  const requestChange = useRequestMembershipChange();

  const [months, setMonths] = useState<PauseMonths | null>(null);
  const [errors, setErrors] = useState<FormErrors<typeof pauseFormSchema>>({});

  const courseCount = coursesQuery.data?.length ?? 0;
  const blockedReason = previewQuery.data?.blockedReason ?? null;
  const pauseBlockedReason = previewQuery.data?.pauseBlockedReason ?? null;
  // Until the database says the student can, the pause can't be asked for.
  const isBlocked = !previewQuery.isSuccess || blockedReason !== null || pauseBlockedReason !== null || courseCount === 0;

  const handleMonthsChange = (value: PauseMonths | null) => {
    setMonths(value);
    setErrors({});
  };

  const handlePause = async () => {
    const found = validationErrors(pauseFormSchema, { months });
    setErrors(found);
    if (Object.keys(found).length > 0 || months === null) return;
    try {
      await requestChange.mutateAsync({ kind: "pause", courseIds: [], reason: "", months });
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
          label={months !== null && !isBlocked ? `Pausar ${pauseMonthsLabel(months)}` : "Pausar membresía"}
          disabled={isBlocked}
          loading={requestChange.isPending}
          onPress={handlePause}
        />
      }
    >
      <ScreenHeader
        eyebrow="Mi membresía"
        title="Pausar membresía"
        subtitle="Es gratis: conservas tus cursos y no tienes que matricularte de nuevo. Una pausa por año."
      />
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

                  <PauseForm
                    months={months}
                    onMonthsChange={handleMonthsChange}
                    error={errors.months}
                    startDate={preview.effectiveDate}
                    endDates={preview.pauseEndDates}
                    monthlyFare={monthlyFareFor(faresQuery.data, myCourses.length)}
                  />

                  {isShifted && preview.paymentDate && preview.effectiveDate && (
                    <Notice tone="pending" className="mx-3 mt-2.5">
                      {`Faltan menos de 8 días para tu pago del ${formatDayMonth(
                        preview.paymentDate,
                      )}: ese mes lo pagas y la pausa empieza el ${formatDayMonth(preview.effectiveDate)}.`}
                    </Notice>
                  )}

                  {preview.pauseBlockedReason === "PAUSE_YEAR_LIMIT" && preview.effectiveDate && (
                    <Notice tone="neutral" className="mx-3 mt-2.5">
                      {preview.nextPauseDate
                        ? `Ya usaste tu pausa de ${preview.effectiveDate.getFullYear()}. La próxima puede empezar en tu pago del ${formatDayMonthYear(
                            preview.nextPauseDate,
                          )}.`
                        : `Ya usaste tu pausa de ${preview.effectiveDate.getFullYear()}.`}
                    </Notice>
                  )}

                  {preview.pauseBlockedReason === "ENROLLMENT_PENDING" && (
                    <CancelBlockedNotice reason={preview.pauseBlockedReason} className="mx-3 mt-2.5" />
                  )}
                </>
              );
            }}
          </DataLoader>
        )}
      </DataLoader>
    </Screen>
  );
};

export default PauseMembershipScreen;
