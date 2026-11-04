import DataLoader from "@/components/DataLoader";
import ImageModal from "@/components/ImageModal";
import AmountRow from "@/components/ui/AmountRow";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatShortDate, paymentStatusLabel, to12hLabel } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import type { ReviewStatus } from "@/hooks/enrollment/schema";
import { usePaymentCount } from "@/hooks/payment/usePaymentCount";
import { usePayments } from "@/hooks/payment/usePayments";
import { useReviewPayment } from "@/hooks/payment/useReviewPayment";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";

/**
 * Admin: one receipt next to the amount it should show, to approve or reject
 * it. Opened from the "Cobros" list, whose loaded page (`status`) gives the
 * position and the next payment to review.
 */
export default function PaymentReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ paymentId: string; status?: string }>();
  const listStatus: ReviewStatus =
    params.status === "approved" || params.status === "rejected" ? params.status : "pending";
  const paymentsQuery = usePayments(listStatus);
  const countQuery = usePaymentCount(listStatus);
  const reviewPayment = useReviewPayment();
  const [zoomed, setZoomed] = useState(false);

  const payments = paymentsQuery.data ?? [];
  const index = payments.findIndex((p) => p.id === params.paymentId);
  const payment = index >= 0 ? payments[index] : undefined;
  const next = index >= 0 ? payments[index + 1] : undefined;
  const name = payment?.user ? `${payment.user.name} ${payment.user.lastName}`.trim() : "Estudiante";
  const eyebrow = index >= 0 && countQuery.data ? `Cobro ${index + 1} de ${countQuery.data}` : "Cobro";

  const openPayment = (paymentId: string) =>
    router.replace({ pathname: "/private/admin/payments/[paymentId]", params: { paymentId, status: listStatus } });

  // After a decision, straight to the next receipt (or back to the list).
  const review = async (decision: "approved" | "rejected") => {
    if (!payment) return;
    try {
      await reviewPayment.mutateAsync({ paymentId: payment.id, status: decision });
    } catch {
      return; // useReviewPayment already showed the error
    }
    if (next) openPayment(next.id);
    else router.back();
  };

  const confirmReject = () =>
    Alert.alert("Rechazar pago", `¿Rechazar el pago de ${name}? Tendrá que enviarlo de nuevo.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Rechazar", style: "destructive", onPress: () => review("rejected") },
    ]);

  const footer =
    payment?.status === "pending" ? (
      <View className="flex-row gap-2.5">
        <Button
          label="Rechazar"
          variant="danger"
          onPress={confirmReject}
          disabled={reviewPayment.isPending}
          className="flex-1"
        />
        <Button
          label="Aprobar pago"
          icon="checkmark"
          onPress={() => review("approved")}
          loading={reviewPayment.isPending}
          className="flex-[1.6]"
        />
      </View>
    ) : undefined;

  return (
    <Screen footer={footer}>
      <ScreenHeader
        eyebrow={eyebrow}
        title={payment ? name : "Cobro"}
        right={
          <IconButton
            icon="chevron-forward"
            onPress={() => next && openPayment(next.id)}
            disabled={!next}
            accessibilityLabel="Siguiente cobro"
          />
        }
      />
      <DataLoader query={{ ...paymentsQuery, data: payment }} emptyMessage="Este cobro ya no está en la lista.">
        {(payment) => {
          const annualFee = payment.totalAmount - payment.monthlyFare - payment.lateFare;
          return (
            <>
              <View className="flex-row flex-wrap gap-1.5 px-5 pt-3">
                {payment.status === "pending" ? (
                  <Chip
                    label={payment.isLate ? `Atrasado ${payment.daysLate} d` : "A tiempo"}
                    tone={payment.isLate ? "late" : "line"}
                  />
                ) : (
                  <Chip
                    label={paymentStatusLabel[payment.status]}
                    tone={payment.status === "approved" ? "ok" : "muted"}
                  />
                )}
                <Chip label="Mensualidad" />
                {payment.annualFeeYear ? <Chip label={`Matrícula ${payment.annualFeeYear}`} tone="pending" /> : null}
              </View>
              <AppText tone="muted" className="px-5 pt-2 text-[14px]">
                Enviado {formatShortDate(payment.createdAt).toLowerCase()}, {to12hLabel(payment.createdAt)}
              </AppText>

              <Pressable
                onPress={() => setZoomed(true)}
                disabled={!payment.receiptUrl}
                accessibilityRole="button"
                accessibilityLabel="Ampliar comprobante"
                className="mx-3 mt-4 h-[330px] overflow-hidden rounded-[18px] bg-control"
              >
                {payment.receiptUrl ? (
                  <Image source={{ uri: payment.receiptUrl }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <View className="flex-1 items-center justify-center gap-2">
                    <Ionicons name="image-outline" size={32} color={palette.faint} />
                    <AppText tone="muted" className="text-[13px]">
                      El comprobante ya se eliminó.
                    </AppText>
                  </View>
                )}
                <View className="absolute left-3 top-3 rounded-md bg-surface px-2 py-1">
                  <AppText variant="label" tone="muted" className="text-[10px]">
                    Comprobante
                  </AppText>
                </View>
                {payment.receiptUrl && (
                  <View className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full bg-surface">
                    <Ionicons name="expand-outline" size={18} color={palette.ink} />
                  </View>
                )}
              </Pressable>

              <Card padded={false} className="mx-3 mt-2.5 px-4">
                <AmountRow label={payment.courses.map((course) => course.title).join(" + ")} amount={payment.monthlyFare} />
                {payment.isLate && (
                  <AmountRow
                    label={`Recargo · ${payment.daysLate} ${payment.daysLate === 1 ? "día" : "días"}`}
                    amount={payment.lateFare}
                  />
                )}
                {payment.annualFeeYear && annualFee > 0 ? (
                  <AmountRow label={`Matrícula anual ${payment.annualFeeYear}`} amount={annualFee} />
                ) : null}
                <AmountRow label="Total esperado" amount={payment.totalAmount} total divider={false} />
              </Card>

              <ImageModal
                isVisible={zoomed}
                imageSelected={payment.receiptUrl ?? ""}
                toggleVisibility={() => setZoomed(false)}
              />
            </>
          );
        }}
      </DataLoader>
    </Screen>
  );
}
