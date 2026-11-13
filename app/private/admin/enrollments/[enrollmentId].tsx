import DataLoader from "@/components/DataLoader";
import AgeChip from "@/components/profile/AgeChip";
import ReceiptPreview from "@/components/ReceiptPreview";
import AmountRow from "@/components/ui/AmountRow";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatShortDate, shortDayName, to12hLabel } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import type { ReviewStatus } from "@/hooks/enrollment/schema";
import { useEnrollmentCount } from "@/hooks/enrollment/useEnrollmentCount";
import { useEnrollmentsByStatus } from "@/hooks/enrollment/useEnrollmentsByStatus";
import { useReviewEnrollment } from "@/hooks/enrollment/useReviewEnrollment";
import { useFares } from "@/hooks/fares/useFares";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, View } from "react-native";

/**
 * Admin: one enrollment request with its courses, amount and receipt, to accept
 * or reject it. Opened from the list, whose loaded page (`status`) gives the
 * position and the next request to review.
 */
const EnrollmentReviewScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ enrollmentId: string; status?: string }>();
  const listStatus: ReviewStatus =
    params.status === "approved" || params.status === "rejected" ? params.status : "pending";
  const enrollmentsQuery = useEnrollmentsByStatus(listStatus);
  const countQuery = useEnrollmentCount(listStatus);
  const reviewEnrollment = useReviewEnrollment();
  const faresQuery = useFares();

  const enrollments = enrollmentsQuery.data ?? [];
  const index = enrollments.findIndex((e) => e.id === params.enrollmentId);
  const enrollment = index >= 0 ? enrollments[index] : undefined;
  const next = index >= 0 ? enrollments[index + 1] : undefined;
  const name = enrollment?.user ? `${enrollment.user.name} ${enrollment.user.lastName}`.trim() : "Estudiante";
  const eyebrow = index >= 0 && countQuery.data ? `Solicitud ${index + 1} de ${countQuery.data}` : "Solicitud";
  const annualFare = faresQuery.data?.find((fare) => fare.type === "annual")?.fare ?? 0;

  const openEnrollment = (enrollmentId: string) =>
    router.replace({
      pathname: "/private/admin/enrollments/[enrollmentId]",
      params: { enrollmentId, status: listStatus },
    });

  // After a decision, straight to the next request (or back to the list).
  const review = async (decision: "approved" | "rejected") => {
    if (!enrollment) return;
    try {
      await reviewEnrollment.mutateAsync({ enrollmentId: enrollment.id, status: decision });
    } catch {
      return; // useReviewEnrollment already showed the error
    }
    if (next) openEnrollment(next.id);
    else router.back();
  };

  const confirmReject = () =>
    Alert.alert("Rechazar matrícula", `¿Rechazar la matrícula de ${name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Rechazar", style: "destructive", onPress: () => review("rejected") },
    ]);

  const footer =
    enrollment?.status === "pending" ? (
      <View className="flex-row gap-2.5">
        <Button
          label="Rechazar"
          variant="danger"
          onPress={confirmReject}
          disabled={reviewEnrollment.isPending}
          className="flex-1"
        />
        <Button
          label="Aceptar matrícula"
          icon="checkmark"
          onPress={() => review("approved")}
          loading={reviewEnrollment.isPending}
          className="flex-[1.6]"
        />
      </View>
    ) : undefined;

  return (
    <Screen footer={footer}>
      <ScreenHeader
        eyebrow={eyebrow}
        title={enrollment ? name : "Solicitud"}
        subtitle={enrollment?.user ? [enrollment.user.phone, enrollment.user.email].filter(Boolean).join(" · ") : undefined}
        right={
          <IconButton
            icon="chevron-forward"
            onPress={() => next && openEnrollment(next.id)}
            disabled={!next}
            accessibilityLabel="Siguiente solicitud"
          />
        }
      />
      <DataLoader query={{ ...enrollmentsQuery, data: enrollment }} emptyMessage="Esta solicitud ya no está en la lista.">
        {(enrollment) => {
          const hasAnnualFee = !!enrollment.annualFeeYear && annualFare > 0;
          return (
            <>
              <View className="flex-row flex-wrap items-center gap-1.5 px-5 pt-2.5">
                {enrollment.status === "pending" ? (
                  <Chip label="Pendiente" tone="pending" />
                ) : (
                  <Chip
                    label={enrollment.status === "approved" ? "Aceptada" : "Rechazada"}
                    tone={enrollment.status === "approved" ? "ok" : "muted"}
                  />
                )}
                <AgeChip birthDate={enrollment.user?.birthDate} />
                {enrollment.source === "manual" && <Chip label="Asignada por admin" />}
                {enrollment.user && (
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: "/private/admin/user/[uid]", params: { uid: enrollment.userId } })
                    }
                    accessibilityRole="link"
                    hitSlop={8}
                    className="ml-1"
                  >
                    <AppText variant="semibold" className="text-[13px] underline">
                      Ver perfil
                    </AppText>
                  </Pressable>
                )}
              </View>
              <AppText tone="muted" className="px-5 pt-2 text-[14px]">
                {`${enrollment.source === "manual" ? "Asignada" : "Enviada"} ${formatShortDate(enrollment.submittedAt).toLowerCase()}, ${to12hLabel(enrollment.submittedAt)}`}
              </AppText>

              <Card className="mx-3 mt-4 gap-1">
                <AppText variant="label-bold" accessibilityRole="header" className="pb-1 text-[12px]">
                  {enrollment.courses.length === 1 ? "Curso solicitado" : "Cursos solicitados"}
                </AppText>
                {enrollment.courses.map((course, i) => (
                  <Pressable
                    key={course.id}
                    onPress={() => router.push({ pathname: "/private/admin/courses/[id]", params: { id: course.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={course.title}
                    className={`flex-row items-center gap-3 py-2 active:opacity-70 ${
                      i > 0 ? "border-t border-line-soft" : ""
                    }`}
                  >
                    <View className="h-12 w-11 items-center justify-center rounded-[10px] bg-ink">
                      <AppText variant="label-bold" tone="inverse" className="text-[11px]">
                        {shortDayName(course.day) || "—"}
                      </AppText>
                    </View>
                    <View className="flex-1">
                      <AppText variant="bold" className="text-[15px]" numberOfLines={1}>
                        {course.title}
                      </AppText>
                      <AppText tone="muted" className="text-[13px]" numberOfLines={1}>
                        {[`Nivel ${course.level}`, course.branch?.name].filter(Boolean).join(" · ")}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={palette.faint} />
                  </Pressable>
                ))}
              </Card>

              <Card padded={false} className="mx-3 mt-2.5 px-4">
                {hasAnnualFee && (
                  <>
                    <AmountRow label="Mensualidad" amount={Math.max(0, enrollment.totalAmount - annualFare)} />
                    <AmountRow label={`Matrícula anual ${enrollment.annualFeeYear}`} amount={annualFare} />
                  </>
                )}
                <AmountRow label="Total esperado" amount={enrollment.totalAmount} total divider={false} />
              </Card>

              <ReceiptPreview
                url={enrollment.receiptUrl}
                height={220}
                emptyMessage={
                  enrollment.totalAmount === 0
                    ? "No hay comprobante: esta solicitud no tiene nada que pagar."
                    : "El comprobante ya se eliminó."
                }
              />
            </>
          );
        }}
      </DataLoader>
    </Screen>
  );
};

export default EnrollmentReviewScreen;
