import DataLoader from "@/components/DataLoader";
import CancelBlockedNotice from "@/components/membership/CancelBlockedNotice";
import DropCoursesForm from "@/components/membership/DropCoursesForm";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatCurrency, formatDayMonth, monthlyFareFor } from "@/constants/helpers";
import { FormErrors, membershipChangeFormSchema, validationErrors } from "@/constants/validationForms";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import { paysComingMonth } from "@/hooks/membership/membershipRules";
import { MEMBERSHIP_ERROR_MESSAGES } from "@/hooks/membership/schema";
import { useMembershipChangePreview } from "@/hooks/membership/useMembershipChangePreview";
import { useRequestMembershipChange } from "@/hooks/membership/useRequestMembershipChange";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

/** "Dar de baja un curso": the student picks courses to leave and keeps the rest. */
const DropCoursesScreen = () => {
  const router = useRouter();
  const { user } = useActiveUser();
  const userId = user?.uid ?? "";
  const coursesQuery = useCoursesByUserMember(userId);
  const previewQuery = useMembershipChangePreview(userId);
  const faresQuery = useFares();
  const requestChange = useRequestMembershipChange();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FormErrors<typeof membershipChangeFormSchema>>({});

  const courses = coursesQuery.data ?? [];
  const leaving = courses.filter((course) => selectedIds.includes(course.courseId));
  const isNoneSelected = leaving.length === 0;
  // Leaving every course is canceling the membership: that's the other screen.
  const isAllSelected = courses.length > 0 && leaving.length === courses.length;
  const blockedReason = previewQuery.data?.blockedReason ?? null;
  const cancelBlockedReason = previewQuery.data?.cancelBlockedReason ?? null;
  const isBlocked = !previewQuery.isSuccess || blockedReason !== null;

  const handleToggle = (courseId: string) => {
    setSelectedIds((ids) => (ids.includes(courseId) ? ids.filter((id) => id !== courseId) : [...ids, courseId]));
  };

  const handleDrop = async () => {
    const found = validationErrors(membershipChangeFormSchema, { reason });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await requestChange.mutateAsync({ kind: "drop", courseIds: leaving.map((course) => course.courseId), reason });
      router.back();
    } catch {
      // useRequestMembershipChange already told the student what went wrong.
    }
  };

  const handleGoToCancel = () => {
    router.replace({ pathname: "/private/user/membership/cancel", params: { reason } });
  };

  const footer = isAllSelected ? (
    <Button
      label="Seguir a cancelar membresía"
      variant="danger"
      disabled={isBlocked || cancelBlockedReason !== null}
      onPress={handleGoToCancel}
    />
  ) : (
    <Button
      label="Dar de baja"
      variant="danger"
      disabled={isBlocked || isNoneSelected}
      loading={requestChange.isPending}
      onPress={handleDrop}
    />
  );

  return (
    <Screen form footer={footer}>
      <ScreenHeader
        eyebrow="Mi membresía"
        title="Dar de baja un curso"
        subtitle="Elige los cursos que se dejan. Los demás siguen igual."
      />
      <DataLoader query={previewQuery}>
        {(preview) => (
          <DataLoader query={coursesQuery} emptyMessage="No tienes cursos activos.">
            {(myCourses) => {
              const fareNow = monthlyFareFor(faresQuery.data, myCourses.length);
              const isShifted = paysComingMonth(preview.paymentDate, preview.effectiveDate);
              return (
                <>
                  {!!preview.blockedReason && (
                    <Notice tone={preview.blockedReason === "PAYMENT_LATE" ? "late" : "neutral"} className="mx-3 mt-4">
                      {MEMBERSHIP_ERROR_MESSAGES[preview.blockedReason] ?? MEMBERSHIP_ERROR_MESSAGES.INVALID_CHANGE}
                    </Notice>
                  )}

                  <DropCoursesForm
                    courses={myCourses}
                    selectedIds={selectedIds}
                    onToggle={handleToggle}
                    effectiveDate={preview.effectiveDate}
                    fares={faresQuery.data}
                  />

                  {!isNoneSelected && isShifted && preview.paymentDate && preview.effectiveDate && (
                    <Notice tone="pending" className="mx-3 mt-2.5">
                      {`Faltan menos de 8 días para tu pago del ${formatDayMonth(preview.paymentDate)}: ese mes lo pagas completo (${formatCurrency(
                        fareNow,
                      )}) y la baja empieza el ${formatDayMonth(preview.effectiveDate)}.`}
                    </Notice>
                  )}

                  {isAllSelected && (
                    <Notice tone="neutral" className="mx-3 mt-2.5">
                      Elegiste todos los cursos: esto cancela la membresía.
                    </Notice>
                  )}
                  {isAllSelected && !!preview.cancelBlockedReason && (
                    <CancelBlockedNotice reason={preview.cancelBlockedReason} className="mx-3 mt-2.5" />
                  )}

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

export default DropCoursesScreen;
