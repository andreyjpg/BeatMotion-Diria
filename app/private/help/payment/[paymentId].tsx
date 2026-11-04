import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Chip, { statusTone } from "@/components/ui/Chip";
import Field from "@/components/ui/Field";
import InfoRow from "@/components/ui/InfoRow";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatCurrency, formatDayMonth, monthName, paymentStatusLabel } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { helpPaymentFormSchema, validationErrors, type FormErrors } from "@/constants/validationForms";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Image, View } from "react-native";

/** Help: a problem with one payment, which goes along with the message so the student only describes it. */
const HelpPaymentScreen = () => {
  const router = useRouter();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const { user } = useActiveUser();
  const paymentsQuery = usePaymentsByUser(user?.uid);
  const payment = paymentsQuery.data?.find((p) => p.id === paymentId);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors<typeof helpPaymentFormSchema>>({});

  const send = () => {
    const found = validationErrors(helpPaymentFormSchema, { message });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    // TODO(ayuda): mock, nothing is sent yet.
    router.replace({ pathname: "/private/help/sent", params: { paymentId } });
  };

  return (
    <Screen form footer={<Button label="Enviar a soporte" icon="send" onPress={send} disabled={!payment} />}>
      <ScreenHeader nav="close" eyebrow="Ayuda · pagos" title="Problema con un pago" />
      <DataLoader query={{ ...paymentsQuery, data: payment }} emptyMessage="No encontramos este pago.">
        {(payment) => (
          <>
            <View className="mx-3 mt-4 rounded-[18px] border-[1.5px] border-field-line bg-field px-4 pb-3.5 pt-3">
              <View className="flex-row items-center gap-2 pb-1">
                <Ionicons name="lock-closed-outline" size={15} color={palette.muted} />
                <AppText variant="label" tone="muted" className="text-[10px]">
                  Ya incluido en tu mensaje
                </AppText>
              </View>
              <InfoRow label="Pago">{`Mensualidad de ${monthName(payment.createdAt)}`}</InfoRow>
              <InfoRow label="Monto">{formatCurrency(payment.totalAmount)}</InfoRow>
              <InfoRow label="Estado">
                <Chip
                  label={`${paymentStatusLabel[payment.status]} · ${formatDayMonth(payment.reviewedAt ?? payment.createdAt)}`}
                  tone={statusTone(payment.status)}
                />
              </InfoRow>
              <InfoRow label="Cursos">{payment.courses.map((course) => course.title).join(" + ")}</InfoRow>
              <View className="flex-row items-center gap-2.5 pt-2.5">
                <View className="h-[50px] w-10 items-center justify-center overflow-hidden rounded-lg bg-control">
                  {payment.receiptUrl ? (
                    <Image source={{ uri: payment.receiptUrl }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <Ionicons name="image-outline" size={16} color={palette.faint} />
                  )}
                </View>
                <View className="flex-1">
                  <AppText variant="bold" className="text-[14px]">
                    Comprobante
                  </AppText>
                  <AppText tone="muted" className="text-[12px]">
                    Se adjunta el comprobante que enviaste
                  </AppText>
                </View>
              </View>
            </View>

            <Field
              label="¿Qué pasó con este pago?"
              multiline
              value={message}
              onChangeText={setMessage}
              placeholder="Describe el problema con tus palabras"
              maxLength={500}
              error={errors.message}
              hint="Es lo único que necesitas escribir."
              className="mx-5 mt-4"
            />
          </>
        )}
      </DataLoader>
    </Screen>
  );
};

export default HelpPaymentScreen;
