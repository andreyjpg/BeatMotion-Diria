import DataLoader from "@/components/DataLoader";
import TransferDetailsMock from "@/components/mocks/TransferDetailsMock";
import { pickImage, RECEIPT_PERMISSION_MESSAGE } from "@/components/pickImage";
import AmountRow from "@/components/ui/AmountRow";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip, { type ChipTone } from "@/components/ui/Chip";
import { SHOW_FEATURE_MOCKS } from "@/constants/featureMocks";
import {
  daysBetween,
  formatCurrency,
  formatDayMonth,
  formatLongDate,
  lastDayWithoutLateFee,
  lateFeeFor,
  lateFeePerDay,
  monthlyFareFor,
  monthName,
  planName,
} from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import { useAnnualFeeDue } from "@/hooks/payment/useAnnualFeeDue";
import { useCreatePayment } from "@/hooks/payment/useCreatePayment";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import type { PickedImage } from "@/hooks/storage/compressImage";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, View } from "react-native";

/** "Vence en 11 días" on the amount card, or how late it already is. */
const dueChip = (daysToDue: number): { label: string; tone: ChipTone } => {
  if (daysToDue > 1) return { label: `Vence en ${daysToDue} días`, tone: "inverse" };
  if (daysToDue === 1) return { label: "Vence mañana", tone: "inverse" };
  if (daysToDue === 0) return { label: "Vence hoy", tone: "inverse" };
  return { label: `Atrasado ${-daysToDue} d`, tone: "late" };
};

/** "Por pagar": this month's amount, how it adds up, and sending the receipt. */
const Detail = () => {
  const { user } = useActiveUser();
  const faresQuery = useFares();
  const coursesQuery = useCoursesByUserMember(user?.uid ?? "");
  const paymentsQuery = usePaymentsByUser(user?.uid);
  const annualFeeQuery = useAnnualFeeDue(user?.uid);
  const createPayment = useCreatePayment();
  const [receipt, setReceipt] = useState<PickedImage | null>(null);

  const courses = coursesQuery.data ?? [];
  // New courses share the student's existing due date, so the earliest one is
  // the date for the whole monthly payment.
  const dueDate =
    courses
      .map((course) => course.nextPaymentDate)
      .filter((date): date is Date => date instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const owesPayment = courses.some((course) => course.paymentStatus !== "ok");

  // Without fares every price is 0; never let a payment go out like that.
  const faresReady = (faresQuery.data?.length ?? 0) > 0;
  const monthlyFare = monthlyFareFor(faresQuery.data, courses.length);
  const lateFee = lateFeeFor(faresQuery.data, dueDate);
  const shouldChargeAnnualFee = annualFeeQuery.data ?? false;
  const annualFare =
    faresQuery.data?.find((d) => d.type === "annual")?.fare ?? 0;
  const totalAmount =
    monthlyFare + lateFee.amount + (shouldChargeAnnualFee ? annualFare : 0);

  const pendingPayment = paymentsQuery.data?.find((payment) => payment.status === "pending");

  const handleImagePick = async () => {
    const picked = await pickImage(RECEIPT_PERMISSION_MESSAGE);
    if (picked) setReceipt(picked);
  };

  const handleMakePayment = async () => {
    if (!receipt) return;
    try {
      await createPayment.mutateAsync({
        courseIds: courses.map((course) => course.courseId),
        receipt,
        monthlyFare,
        lateFare: lateFee.amount,
        daysLate: lateFee.days,
        totalAmount,
        annualFeeYear: shouldChargeAnnualFee ? new Date().getFullYear() : null,
      });
      setReceipt(null);
    } catch {
      // useCreatePayment already told the student what went wrong.
    }
  };

  const refresh = () => {
    coursesQuery.refetch();
    paymentsQuery.refetch();
    faresQuery.refetch();
    annualFeeQuery.refetch();
  };

  return (
    <DataLoader query={coursesQuery} emptyMessage="No tienes pagos pendientes.">
      {(myCourses) => (
        <ScrollView
          contentContainerClassName="pb-8"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={coursesQuery.isRefetching} onRefresh={refresh} />}
        >
          {!owesPayment ? (
            <View className="items-center gap-2 px-8 pt-16">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-ink">
                <Ionicons name="checkmark" size={28} color={palette.surface} />
              </View>
              <AppText variant="display" className="mt-2 text-[28px]">
                Estás al día
              </AppText>
              <AppText tone="muted" className="text-center text-[14.5px] leading-[20px]">
                {dueDate
                  ? `Tu próximo pago vence el ${formatLongDate(dueDate)}.`
                  : "No tienes pagos pendientes."}
              </AppText>
            </View>
          ) : (
            <>
              <View className="mx-3 mt-3.5 rounded-[22px] bg-ink p-[18px]">
                <View className="flex-row items-center justify-between gap-2">
                  <AppText variant="label" tone="hero-muted" className="text-[10px]">
                    {dueDate ? `Mensualidad de ${monthName(dueDate)}` : "Mensualidad"}
                  </AppText>
                  {dueDate && <Chip {...dueChip(daysBetween(new Date(), dueDate))} />}
                </View>
                <AppText variant="heavy" tone="inverse" className="mt-2.5 text-[44px] leading-[50px]">
                  {formatCurrency(totalAmount)}
                </AppText>
                {dueDate && (
                  <AppText tone="hero-soft" className="mt-1 text-[13.5px]">
                    Fecha límite: {formatLongDate(dueDate)}
                  </AppText>
                )}
              </View>

              <Card padded={false} className="mx-3 mt-2.5 px-4 pb-1">
                <AmountRow
                  label={`${planName(myCourses.length)} · ${myCourses.map((course) => course.title).join(" + ")}`}
                  amount={monthlyFare}
                />
                <AmountRow
                  label={
                    lateFee.days > 0
                      ? `Recargo · ${lateFee.days} ${lateFee.days === 1 ? "día" : "días"} de atraso`
                      : "Recargo por atraso"
                  }
                  amount={lateFee.amount}
                  muted={lateFee.days === 0}
                />
                {shouldChargeAnnualFee && <AmountRow label="Matrícula anual" amount={annualFare} />}
                <AmountRow label="Total" amount={totalAmount} total divider={false} />
                {dueDate && lateFee.days === 0 && (
                  <AppText tone="muted" className="mb-2 text-[12px] leading-[17px]">
                    Después del {formatDayMonth(lastDayWithoutLateFee(dueDate))} se suman{" "}
                    {formatCurrency(lateFeePerDay(faresQuery.data))} por cada día de atraso.
                  </AppText>
                )}
              </Card>

              {faresQuery.isFetched && !faresReady && (
                <View className="mx-3 mt-2.5 flex-row gap-2.5 rounded-[18px] bg-danger-soft p-4">
                  <Ionicons name="alert-circle-outline" size={20} color={palette.danger.DEFAULT} />
                  <AppText tone="danger" className="flex-1 text-[14px] leading-[20px]">
                    No se pudieron cargar las tarifas. Intenta más tarde o contacta a la academia.
                  </AppText>
                </View>
              )}

              {pendingPayment ? (
                <View className="mx-3 mt-2.5 flex-row gap-2.5 rounded-[18px] bg-sand-soft p-4">
                  <Ionicons name="time-outline" size={20} color={palette.sand.ink} />
                  <AppText tone="sand" className="flex-1 text-[14px] leading-[20px]">
                    Tu pago del {formatDayMonth(pendingPayment.createdAt)} está en revisión. Te avisamos
                    cuando la academia lo apruebe.
                  </AppText>
                </View>
              ) : (
                <>
                  {SHOW_FEATURE_MOCKS && <TransferDetailsMock />}
                  <Pressable
                    onPress={handleImagePick}
                    accessibilityRole="button"
                    accessibilityLabel={receipt ? "Cambiar comprobante" : "Subir comprobante"}
                    className={`mx-3 mt-2.5 h-[52px] flex-row items-center justify-center gap-2 rounded-[14px] border-2 border-dashed active:opacity-70 ${
                      // Ground color, not none: Android drops the rounded corners when a
                      // background is added after the first render.
                      receipt ? "border-ink bg-surface" : "border-faint bg-ground"
                    }`}
                  >
                    {receipt ? (
                      <Image source={{ uri: receipt.uri }} className="h-8 w-8 rounded-md" />
                    ) : (
                      <Ionicons name="cloud-upload-outline" size={20} color={palette.ink} />
                    )}
                    <AppText variant="semibold" className="text-[14.5px]">
                      {receipt ? "Comprobante listo · Cambiar" : "Subir comprobante"}
                    </AppText>
                  </Pressable>
                  <Button
                    label="Enviar pago"
                    onPress={handleMakePayment}
                    loading={createPayment.isPending}
                    disabled={
                      !receipt ||
                      !paymentsQuery.isSuccess ||
                      !annualFeeQuery.isSuccess ||
                      !faresReady
                    }
                    className="mx-3 mt-2.5"
                  />
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </DataLoader>
  );
};

export default Detail;
