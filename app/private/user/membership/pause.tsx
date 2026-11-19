import DataLoader from "@/components/DataLoader";
import FieldError from "@/components/FieldError";
import CancelBlockedNotice from "@/components/membership/CancelBlockedNotice";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InfoRow from "@/components/ui/InfoRow";
import Notice from "@/components/ui/Notice";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { formatCurrency, formatDayMonth, formatDayMonthYear, monthlyFareFor, plural } from "@/constants/helpers";
import { type FormErrors, pauseFormSchema, validationErrors } from "@/constants/validationForms";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import { paysComingMonth } from "@/hooks/membership/membershipRules";
import {
  MEMBERSHIP_ERROR_MESSAGES,
  PAUSE_MONTHS,
  type MembershipChangePreview,
  type PauseMonths,
} from "@/hooks/membership/schema";
import { useMembershipChangePreview } from "@/hooks/membership/useMembershipChangePreview";
import { useRequestMembershipChange } from "@/hooks/membership/useRequestMembershipChange";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import { useState } from "react";

// The canvas text without "ni invitar a nadie" (guests don't exist yet) and
// without promising no payment reminders: the usual one comes 10 days before
// the pause ends.
const DURING_PAUSE_TEXT =
  "Durante la pausa no llegan recordatorios de asistencia y no se puede matricular. El recordatorio de pago llega 10 días antes de volver, como siempre. Se puede volver antes en cualquier momento.";

/** "1 mes", "3 meses". */
const monthsLabel = (months: PauseMonths) => plural(months, "mes", "meses");

const SEGMENTS = PAUSE_MONTHS.map((months) => ({ value: String(months), label: monthsLabel(months) }));

/** The end of a pause of `months` from the preview (pauseEndDates follows PAUSE_MONTHS); null until chosen. */
const endDateFor = (preview: MembershipChangePreview, months: PauseMonths | null) =>
  months === null ? null : (preview.pauseEndDates[PAUSE_MONTHS.indexOf(months)] ?? null);

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

  const handleMonthsChange = (value: string) => {
    setMonths(PAUSE_MONTHS.find((option) => String(option) === value) ?? null);
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
          label={months !== null && !isBlocked ? `Pausar ${monthsLabel(months)}` : "Pausar membresía"}
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
              const endDate = endDateFor(preview, months);
              const monthlyFare = monthlyFareFor(faresQuery.data, myCourses.length);
              const isShifted = paysComingMonth(preview.paymentDate, preview.effectiveDate);
              return (
                <>
                  {!!preview.blockedReason && (
                    <Notice tone={preview.blockedReason === "PAYMENT_LATE" ? "late" : "neutral"} className="mx-3 mt-4">
                      {MEMBERSHIP_ERROR_MESSAGES[preview.blockedReason] ?? MEMBERSHIP_ERROR_MESSAGES.INVALID_CHANGE}
                    </Notice>
                  )}

                  <Card className="mx-3 mt-4 gap-3">
                    <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
                      ¿Cuánto tiempo?
                    </AppText>
                    <SegmentedControl
                      segments={SEGMENTS}
                      value={months === null ? "" : String(months)}
                      onChange={handleMonthsChange}
                      accessibilityLabel="Duración de la pausa"
                    />
                    <FieldError message={errors.months} className="" />
                  </Card>

                  <Card padded={false} className="mx-3 mt-2.5 px-4 pb-3 pt-1">
                    <InfoRow label="Empieza">{preview.effectiveDate ? formatDayMonth(preview.effectiveDate) : "—"}</InfoRow>
                    <InfoRow label="Termina">{endDate ? formatDayMonth(endDate) : "Elige la duración"}</InfoRow>
                    <InfoRow label="Vuelve a pagar">
                      {endDate ? `${formatDayMonth(endDate)} · ${formatCurrency(monthlyFare)}` : "—"}
                    </InfoRow>
                    <AppText tone="muted" className="pt-2.5 text-[12.5px] leading-[17px]">
                      {DURING_PAUSE_TEXT}
                    </AppText>
                  </Card>

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
