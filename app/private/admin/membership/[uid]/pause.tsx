import DataLoader from "@/components/DataLoader";
import AdminChangeNotices from "@/components/membership/admin/AdminChangeNotices";
import PauseForm, { pauseMonthsLabel } from "@/components/membership/PauseForm";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatDayMonth, monthlyFareFor } from "@/constants/helpers";
import { adminPauseFormSchema, type FormErrors, validationErrors } from "@/constants/validationForms";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import { appliesToday } from "@/hooks/membership/membershipRules";
import type { PauseMonths } from "@/hooks/membership/schema";
import { useAdminMembershipChangePreview } from "@/hooks/membership/useAdminMembershipChangePreview";
import { useAdminRequestMembershipChange } from "@/hooks/membership/useAdminRequestMembershipChange";
import { useUserInfo } from "@/hooks/user/useUserInfo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

/** The confirmation of a pause that starts now, and the month it leaves uncharged. */
const pauseTodayMessage = (studentName: string, owedPaymentDate: Date | null) => {
  const owed = owedPaymentDate ? ` No se cobra la mensualidad del ${formatDayMonth(owedPaymentDate)}.` : "";
  return `La pausa de ${studentName} empieza hoy y sus cursos se pausan ahora.${owed} Puedes terminarla antes desde su perfil.`;
};

/** Admin: pauses a student's membership for 1, 2 or 3 months, without the student's rules. */
const AdminPauseScreen = () => {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const userQuery = useUserInfo(uid);
  const coursesQuery = useCoursesByUserMember(uid);
  const previewQuery = useAdminMembershipChangePreview(uid);
  const faresQuery = useFares();
  const requestChange = useAdminRequestMembershipChange();

  const [months, setMonths] = useState<PauseMonths | null>(null);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FormErrors<typeof adminPauseFormSchema>>({});

  const firstName = userQuery.data?.name.trim() || "El estudiante";
  const fullName = userQuery.data?.fullName.trim() || "el estudiante";
  const courseCount = coursesQuery.data?.length ?? 0;
  const preview = previewQuery.data;
  // An enrollment in review blocks a pause (it covers every course).
  const isBlocked =
    !preview || preview.blockedReason !== null || preview.cancelBlockedReason !== null || courseCount === 0;
  const startsToday = appliesToday(preview?.effectiveDate ?? null);

  const handleMonthsChange = (value: PauseMonths | null) => {
    setMonths(value);
    setErrors(({ months: _, ...otherErrors }) => otherErrors);
  };

  const submit = async (chosenMonths: PauseMonths) => {
    try {
      await requestChange.mutateAsync({ userId: uid, kind: "pause", courseIds: [], reason, months: chosenMonths });
      router.back();
    } catch {
      // useAdminRequestMembershipChange already told the admin what went wrong.
    }
  };

  const handlePause = () => {
    const found = validationErrors(adminPauseFormSchema, { months, reason });
    setErrors(found);
    if (Object.keys(found).length > 0 || months === null) return;
    if (!startsToday) {
      submit(months);
      return;
    }
    Alert.alert("¿Pausar desde hoy?", pauseTodayMessage(firstName, preview?.owedPaymentDate ?? null), [
      { text: "No", style: "cancel" },
      { text: "Sí, pausar hoy", onPress: () => submit(months) },
    ]);
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
        eyebrow={`Para ${fullName}`}
        title="Pausar membresía"
        subtitle="Es gratis: conserva sus cursos y no tiene que matricularse de nuevo. Cuenta como su pausa del año."
      />
      <DataLoader query={previewQuery}>
        {(adminPreview) => (
          <DataLoader query={coursesQuery} emptyMessage="No tiene cursos activos.">
            {(studentCourses) => (
              <>
                <PauseForm
                  months={months}
                  onMonthsChange={handleMonthsChange}
                  error={errors.months}
                  startDate={adminPreview.effectiveDate}
                  endDates={adminPreview.pauseEndDates}
                  monthlyFare={monthlyFareFor(faresQuery.data, studentCourses.length)}
                  startsToday={startsToday}
                />

                <AdminChangeNotices
                  kind="pause"
                  studentName={firstName}
                  preview={adminPreview}
                  isCoveringAll
                  hasPaymentInReview={false}
                />

                <View className="px-5 pt-5">
                  <Field
                    label="Motivo (opcional)"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Por qué se pausa"
                    hint="El estudiante también puede verlo."
                    multiline
                    error={errors.reason}
                  />
                </View>
              </>
            )}
          </DataLoader>
        )}
      </DataLoader>
    </Screen>
  );
};

export default AdminPauseScreen;
