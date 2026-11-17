import DataLoader from "@/components/DataLoader";
import CancelBlockedNotice from "@/components/membership/CancelBlockedNotice";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import Field from "@/components/ui/Field";
import InfoRow from "@/components/ui/InfoRow";
import Notice from "@/components/ui/Notice";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import {
  formatCourseSchedule,
  formatCurrency,
  formatDayMonth,
  joinWithAnd,
  monthlyFareFor,
  planName,
} from "@/constants/helpers";
import { FormErrors, membershipChangeFormSchema, validationErrors } from "@/constants/validationForms";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import { lastDayBefore, paysComingMonth } from "@/hooks/membership/membershipRules";
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
  const branchesQuery = useBranches();
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
              const remainingCount = myCourses.length - leaving.length;
              const isShifted = paysComingMonth(preview.paymentDate, preview.effectiveDate);
              return (
                <>
                  {!!preview.blockedReason && (
                    <Notice tone={preview.blockedReason === "PAYMENT_LATE" ? "late" : "neutral"} className="mx-3 mt-4">
                      {MEMBERSHIP_ERROR_MESSAGES[preview.blockedReason] ?? MEMBERSHIP_ERROR_MESSAGES.INVALID_CHANGE}
                    </Notice>
                  )}

                  <Card padded={false} className="mx-3 mt-4 px-4">
                    {myCourses.map((course, index) => {
                      const branch = branchesQuery.data?.find((b) => b.id === course.branchId);
                      const where = [formatCourseSchedule(course.day, course.startTime, course.endTime), branch?.name]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <Checkbox
                          key={course.id}
                          checked={selectedIds.includes(course.courseId)}
                          onChange={() => handleToggle(course.courseId)}
                          accessibilityLabel={course.title}
                          className={`items-center py-3 ${index < myCourses.length - 1 ? "border-b border-line-soft" : ""}`}
                        >
                          <AppText variant="bold" className="text-[15px]">
                            {course.title}
                          </AppText>
                          {!!where && (
                            <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                              {where}
                            </AppText>
                          )}
                        </Checkbox>
                      );
                    })}
                  </Card>

                  {!isNoneSelected && !isAllSelected && preview.effectiveDate && (
                    <Card padded={false} className="mx-3 mt-2.5 gap-1 px-4 pb-3 pt-2.5">
                      <AppText variant="label-bold" accessibilityRole="header" className="pt-1 text-[12px]">
                        Así queda
                      </AppText>
                      <InfoRow label="Plan">{`${planName(myCourses.length)} → ${planName(remainingCount)}`}</InfoRow>
                      <InfoRow label="Mensualidad">
                        <AppText variant="semibold" className="flex-1 text-right text-[14.5px]">
                          {`${formatCurrency(fareNow)} → `}
                          <AppText variant="heavy" className="text-[14.5px]">
                            {formatCurrency(monthlyFareFor(faresQuery.data, remainingCount))}
                          </AppText>
                        </AppText>
                      </InfoRow>
                      <InfoRow label="Desde" divider={false}>
                        <AppText variant="heavy" className="flex-1 text-right text-[14.5px]">
                          {formatDayMonth(preview.effectiveDate)}
                        </AppText>
                      </InfoRow>
                      <AppText tone="muted" className="text-[12.5px] leading-[17px]">
                        {`Sigues asistiendo a ${joinWithAnd(leaving.map((course) => course.title))} hasta el ${formatDayMonth(
                          lastDayBefore(preview.effectiveDate),
                        )}.`}
                      </AppText>
                    </Card>
                  )}

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
