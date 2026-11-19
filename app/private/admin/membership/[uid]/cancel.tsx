import DataLoader from "@/components/DataLoader";
import AdminChangeNotices from "@/components/membership/admin/AdminChangeNotices";
import CancelFacts from "@/components/membership/CancelFacts";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { monthlyFareFor } from "@/constants/helpers";
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

/** Admin: cancels a student's membership (every course), without the student's rules. */
const AdminCancelMembershipScreen = () => {
  const router = useRouter();
  // The reason written on the drop screen when every course was picked.
  const { uid, reason: reasonParam } = useLocalSearchParams<{ uid: string; reason?: string }>();
  const userQuery = useUserInfo(uid);
  const coursesQuery = useCoursesByUserMember(uid);
  const previewQuery = useAdminMembershipChangePreview(uid);
  const paymentsQuery = usePaymentsByUser(uid);
  const faresQuery = useFares();
  const requestChange = useAdminRequestMembershipChange();

  const [reason, setReason] = useState(reasonParam ?? "");
  const [errors, setErrors] = useState<FormErrors<typeof membershipChangeFormSchema>>({});

  const firstName = userQuery.data?.name.trim() || "El estudiante";
  const fullName = userQuery.data?.fullName.trim() || "el estudiante";
  const courseCount = coursesQuery.data?.length ?? 0;
  const preview = previewQuery.data;
  const isBlocked = !preview || preview.blockedReason !== null || preview.cancelBlockedReason !== null;
  const startsToday = appliesToday(preview?.effectiveDate ?? null);
  const hasPaymentInReview = paymentsQuery.data?.some((payment) => payment.status === "pending") ?? false;
  const lead = `${firstName} deja ${courseCount === 1 ? "su curso" : `sus ${courseCount} cursos`}.`;

  const submit = async () => {
    try {
      await requestChange.mutateAsync({ userId: uid, kind: "cancel", courseIds: [], reason });
      router.back();
    } catch {
      // useAdminRequestMembershipChange already told the admin what went wrong.
    }
  };

  const handleCancel = () => {
    const found = validationErrors(membershipChangeFormSchema, { reason });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (!startsToday) {
      submit();
      return;
    }
    Alert.alert(
      "¿Cancelar hoy?",
      `${firstName} deja sus cursos hoy. Una cancelación de hoy no se puede deshacer.`,
      [
        { text: "No", style: "cancel" },
        { text: "Sí, cancelar hoy", style: "destructive", onPress: submit },
      ],
    );
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
      <ScreenHeader eyebrow={`Para ${fullName}`} title="Cancelar membresía" subtitle={courseCount > 0 ? lead : undefined} />
      <DataLoader query={previewQuery}>
        {(adminPreview) => (
          <DataLoader query={coursesQuery} emptyMessage="No tiene cursos activos.">
            {(studentCourses) => (
              <>
                <CancelFacts
                  effectiveDate={adminPreview.effectiveDate}
                  paymentDate={adminPreview.paymentDate}
                  monthlyFare={monthlyFareFor(faresQuery.data, studentCourses.length)}
                  studentName={firstName}
                />

                <AdminChangeNotices
                  kind="cancel"
                  studentName={firstName}
                  preview={adminPreview}
                  isCoveringAll
                  hasPaymentInReview={hasPaymentInReview}
                />

                <View className="px-5 pt-5">
                  <Field
                    label="Motivo (opcional)"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Por qué se cancela"
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

export default AdminCancelMembershipScreen;
