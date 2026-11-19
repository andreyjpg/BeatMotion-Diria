import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import Chip, { type ChipTone } from "@/components/ui/Chip";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { formatCurrency, formatDayMonth } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import type { ReviewStatus } from "@/hooks/enrollment/schema";
import type { PaymentDetail } from "@/hooks/payment/schema";
import { usePaymentCount } from "@/hooks/payment/usePaymentCount";
import { usePayments } from "@/hooks/payment/usePayments";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";

const SEGMENTS: { value: ReviewStatus; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobados" },
  { value: "rejected", label: "Rechazados" },
];

const EMPTY: Record<ReviewStatus, string> = {
  pending: "No hay comprobantes por revisar.",
  approved: "Todavía no hay pagos aprobados.",
  rejected: "No hay pagos rechazados.",
};

const studentName = (payment: PaymentDetail) =>
  payment.user ? `${payment.user.name} ${payment.user.lastName}`.trim() : "Estudiante";

/** Pending: whether it came late or includes the annual fee. Reviewed: the decision. */
const listChip = (payment: PaymentDetail): { label: string; tone: ChipTone } => {
  if (payment.status === "approved") return { label: "Aprobado", tone: "ok" };
  if (payment.status === "rejected") return { label: "Rechazado", tone: "muted" };
  if (payment.isLate) return { label: `Atrasado ${payment.daysLate} d`, tone: "late" };
  if (payment.annualFeeYear) return { label: "+ Anual", tone: "pending" };
  return { label: "A tiempo", tone: "line" };
};

const listDetails = (payment: PaymentDetail) => {
  const courses =
    payment.courses.length === 1 ? payment.courses[0].title : `${payment.courses.length} cursos`;
  if (payment.status !== "pending") {
    return `${formatDayMonth(payment.reviewedAt ?? payment.createdAt)} · ${courses}`;
  }
  if (payment.isLate) return `${courses} · recargo ${formatCurrency(payment.lateFare)}`;
  if (payment.annualFeeYear) return `${courses} + matrícula anual`;
  return `${courses} · enviado ${formatDayMonth(payment.createdAt)}`;
};

/** Admin "Cobros" tab: the receipts students sent, by review status. */
const PaymentCenter = () => {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const paymentsQuery = usePayments(status);
  const pendingCount = usePaymentCount("pending");
  const approvedCount = usePaymentCount("approved");
  const rejectedCount = usePaymentCount("rejected");

  const counts: Record<ReviewStatus, number | undefined> = {
    pending: pendingCount.data,
    approved: approvedCount.data,
    rejected: rejectedCount.data,
  };
  const count = counts[status];
  const subtitle =
    count === undefined
      ? undefined
      : status === "pending"
        ? count === 0
          ? "Nada por revisar"
          : `${count} ${count === 1 ? "comprobante" : "comprobantes"} por revisar · los atrasados primero`
        : `${count} ${count === 1 ? "pago" : "pagos"} ${status === "approved" ? "aprobados" : "rechazados"}`;

  const refresh = () => {
    paymentsQuery.refetch();
    pendingCount.refetch();
    approvedCount.refetch();
    rejectedCount.refetch();
  };

  const openPayment = (payment: PaymentDetail) =>
    router.push({
      pathname: "/private/admin/payments/[paymentId]",
      params: { paymentId: payment.id, status },
    });

  return (
    <Screen scroll={false} inTabs>
      <ScreenHeader nav={false} title="Cobros" subtitle={subtitle} />
      <SegmentedControl
        segments={SEGMENTS.map((segment) => ({ ...segment, count: counts[segment.value] }))}
        value={status}
        onChange={setStatus}
        accessibilityLabel="Estado de los cobros"
        className="mx-5 mt-4"
      />
      <DataLoader query={paymentsQuery} emptyMessage={EMPTY[status]}>
        {(data, isRefetching) => (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerClassName="gap-2 px-3 pb-8 pt-3.5"
            showsVerticalScrollIndicator={false}
            // Loads the next 20 when nearing the end of the list.
            onEndReached={() => {
              if (paymentsQuery.hasNextPage && !paymentsQuery.isFetchingNextPage) {
                paymentsQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              paymentsQuery.isFetchingNextPage ? <ActivityIndicator color={palette.faint} /> : undefined
            }
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}
            renderItem={({ item }) => (
              <Card
                onPress={() => openPayment(item)}
                accessibilityLabel={`${studentName(item)}, ${formatCurrency(item.totalAmount)}, ${listChip(item).label}`}
                padded={false}
                className="flex-row items-center gap-3 px-3.5 py-3"
              >
                <Avatar name={item.user?.name} lastName={item.user?.lastName} photoUrl={item.user?.photoURL} />
                <View className="flex-1 gap-1.5">
                  <View className="flex-row items-baseline justify-between gap-2">
                    <AppText variant="bold" className="flex-1 text-[15.5px]" numberOfLines={1}>
                      {studentName(item)}
                    </AppText>
                    <AppText variant="heavy" className="text-[17px]">
                      {formatCurrency(item.totalAmount)}
                    </AppText>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Chip {...listChip(item)} />
                    <AppText tone="muted" className="flex-1 text-[12.5px]" numberOfLines={1}>
                      {listDetails(item)}
                    </AppText>
                  </View>
                </View>
              </Card>
            )}
          />
        )}
      </DataLoader>
    </Screen>
  );
};

export default PaymentCenter;
