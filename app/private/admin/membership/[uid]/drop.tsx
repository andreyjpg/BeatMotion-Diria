import DataLoader from "@/components/DataLoader";
import AdminChangeNotices from "@/components/membership/admin/AdminChangeNotices";
import DropCoursesForm from "@/components/membership/DropCoursesForm";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { joinWithAnd } from "@/constants/helpers";
import { FormErrors, membershipChangeFormSchema, validationErrors } from "@/constants/validationForms";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import { appliesToday } from "@/hooks/membership/membershipRules";
import { useAdminMembershipChangePreview } from "@/hooks/membership/useAdminMembershipChangePreview";
import { useAdminRequestMembershipChange } from "@/hooks/membership/useAdminRequestMembershipChange";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import { useUserInfo } from "@/hooks/user/useUserInfo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

/** Admin: drops some of a student's courses, without the student's rules. */
const AdminDropCoursesScreen = () => {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const userQuery = useUserInfo(uid);
  const coursesQuery = useCoursesByUserMember(uid);
  const previewQuery = useAdminMembershipChangePreview(uid);
  const paymentsQuery = usePaymentsByUser(uid);
  const faresQuery = useFares();
  const requestChange = useAdminRequestMembershipChange();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FormErrors<typeof membershipChangeFormSchema>>({});

  const firstName = userQuery.data?.name.trim() || "El estudiante";
  const fullName = userQuery.data?.fullName.trim() || "el estudiante";
  const courses = coursesQuery.data ?? [];
  const leaving = courses.filter((course) => selectedIds.includes(course.courseId));
  const isNoneSelected = leaving.length === 0;
  // Leaving every course is canceling the membership: that's the other screen.
  const isAllSelected = courses.length > 0 && leaving.length === courses.length;
  const preview = previewQuery.data;
  const isBlocked = !preview || preview.blockedReason !== null;
  const startsToday = appliesToday(preview?.effectiveDate ?? null);
  const hasPaymentInReview = paymentsQuery.data?.some((payment) => payment.status === "pending") ?? false;

  const handleToggle = (courseId: string) => {
    setSelectedIds((ids) => (ids.includes(courseId) ? ids.filter((id) => id !== courseId) : [...ids, courseId]));
  };

  const submit = async () => {
    try {
      await requestChange.mutateAsync({
        userId: uid,
        kind: "drop",
        courseIds: leaving.map((course) => course.courseId),
        reason,
      });
      router.back();
    } catch {
      // useAdminRequestMembershipChange already told the admin what went wrong.
    }
  };

  const handleDrop = () => {
    const found = validationErrors(membershipChangeFormSchema, { reason });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (!startsToday) {
      submit();
      return;
    }
    const titles = joinWithAnd(leaving.map((course) => course.title));
    Alert.alert(
      "¿Dar de baja hoy?",
      `${titles} ${leaving.length === 1 ? "sale" : "salen"} del plan de ${firstName} hoy. Una baja de hoy no se puede deshacer.`,
      [
        { text: "No", style: "cancel" },
        { text: "Sí, dar de baja hoy", style: "destructive", onPress: submit },
      ],
    );
  };

  const handleGoToCancel = () => {
    router.replace({ pathname: "/private/admin/membership/[uid]/cancel", params: { uid, reason } });
  };

  const footer = isAllSelected ? (
    <Button
      label="Seguir a cancelar membresía"
      variant="danger"
      disabled={isBlocked || preview?.cancelBlockedReason !== null}
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
        eyebrow={`Para ${fullName}`}
        title="Dar de baja un curso"
        subtitle="Elige los cursos que se dejan. Los demás siguen igual."
      />
      <DataLoader query={previewQuery}>
        {(adminPreview) => (
          <DataLoader query={coursesQuery} emptyMessage="No tiene cursos activos.">
            {(studentCourses) => (
              <>
                <DropCoursesForm
                  courses={studentCourses}
                  selectedIds={selectedIds}
                  onToggle={handleToggle}
                  effectiveDate={adminPreview.effectiveDate}
                  fares={faresQuery.data}
                  studentName={firstName}
                />

                {isAllSelected && (
                  <Notice tone="neutral" className="mx-3 mt-2.5">
                    Elegiste todos los cursos: esto cancela la membresía.
                  </Notice>
                )}
                <AdminChangeNotices
                  kind="drop"
                  studentName={firstName}
                  preview={adminPreview}
                  isCoveringAll={isAllSelected}
                  hasPaymentInReview={hasPaymentInReview}
                />

                <View className="px-5 pt-5">
                  <Field
                    label="Motivo (opcional)"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Por qué se da de baja"
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

export default AdminDropCoursesScreen;
