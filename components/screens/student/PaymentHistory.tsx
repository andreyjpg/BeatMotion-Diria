import DataLoader from "@/components/DataLoader";
import ImageModal from "@/components/ImageModal";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip, { statusTone } from "@/components/ui/Chip";
import { SHOW_FEATURE_MOCKS } from "@/constants/featureMocks";
import {
  capitalize,
  formatCurrency,
  formatDayMonth,
  monthName,
  paymentStatusLabel,
} from "@/constants/helpers";
import palette from "@/constants/palette.json";
import type { PaymentType } from "@/hooks/payment/schema";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, View } from "react-native";

/** "Octubre", or "Octubre 2025" for another year. */
const paymentMonth = (payment: PaymentType) => {
  const month = capitalize(monthName(payment.createdAt));
  const year = payment.createdAt.getFullYear();
  return year === new Date().getFullYear() ? month : `${month} ${year}`;
};

/** Courses paid, plus the late fee, the annual fee or what to do next. */
const paymentDetails = (payment: PaymentType) =>
  [
    payment.courses.map((course) => course.title).join(" + "),
    payment.annualFeeYear ? "matrícula anual" : null,
  ]
    .filter(Boolean)
    .join(" + ") +
  (payment.isLate
    ? ` · ${payment.daysLate} ${payment.daysLate === 1 ? "día" : "días"} de atraso ${formatCurrency(payment.lateFare)}`
    : "") +
  (payment.status === "rejected" ? " · vuelve a enviarlo" : "");

/** "Historial": every payment the student sent, newest first. */
const History = () => {
  const router = useRouter();
  const { user } = useActiveUser();
  const paymentQuery = usePaymentsByUser(user?.uid);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  return (
    <View className="flex-1">
      <DataLoader query={paymentQuery} emptyMessage="Todavía no has enviado ningún pago.">
        {(data, isRefetching, refetch) => (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerClassName="gap-2.5 px-3 pb-8 pt-3.5"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            renderItem={({ item }) => {
              const month = paymentMonth(item);
              const meta =
                item.status === "approved" && item.reviewedAt
                  ? `Pagado ${formatDayMonth(item.reviewedAt)}`
                  : `Enviado ${formatDayMonth(item.createdAt)}`;
              return (
                <Card padded={false} className="overflow-hidden">
                  <View className="flex-row items-start gap-3 p-3.5">
                    <Pressable
                      onPress={() => item.receiptUrl && setReceiptUrl(item.receiptUrl)}
                      disabled={!item.receiptUrl}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver comprobante de ${month}`}
                      className="h-16 w-[52px] items-center justify-center overflow-hidden rounded-[10px] bg-control"
                    >
                      {item.receiptUrl ? (
                        <Image source={{ uri: item.receiptUrl }} className="h-full w-full" resizeMode="cover" />
                      ) : (
                        <Ionicons name="image-outline" size={18} color={palette.faint} />
                      )}
                    </Pressable>
                    <View className="flex-1 gap-1.5">
                      <View className="flex-row items-center justify-between gap-2">
                        <AppText variant="bold" className="flex-1 text-[16px]">
                          {month}
                        </AppText>
                        <Chip label={paymentStatusLabel[item.status]} tone={statusTone(item.status)} />
                      </View>
                      <AppText tone="muted" className="text-[13px] leading-[18px]">
                        {paymentDetails(item)}
                      </AppText>
                      <View className="flex-row items-baseline justify-between">
                        <AppText variant="label" tone="muted" className="text-[10px]">
                          {meta}
                        </AppText>
                        <AppText variant="heavy" className="text-[18px]">
                          {formatCurrency(item.totalAmount)}
                        </AppText>
                      </View>
                    </View>
                  </View>
                  {/* TODO(ayuda): mock entry to the help section with this payment prefilled. */}
                  {SHOW_FEATURE_MOCKS && item.status !== "approved" && (
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: "/private/help/payment/[paymentId]", params: { paymentId: item.id } })
                      }
                      accessibilityRole="button"
                      className="flex-row items-center gap-2 border-t border-line-soft px-3.5 py-3 active:opacity-70"
                    >
                      <Ionicons name="alert-circle-outline" size={18} color={palette.ink} />
                      <AppText variant="semibold" className="flex-1 text-[14px]">
                        ¿Problema con este pago?
                      </AppText>
                      <Ionicons name="chevron-forward" size={18} color={palette.ink} />
                    </Pressable>
                  )}
                </Card>
              );
            }}
          />
        )}
      </DataLoader>
      <ImageModal
        isVisible={receiptUrl !== null}
        imageSelected={receiptUrl ?? ""}
        toggleVisibility={() => setReceiptUrl(null)}
      />
    </View>
  );
};

export default History;
