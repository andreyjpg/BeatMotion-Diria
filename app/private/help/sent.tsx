import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import InfoRow from "@/components/ui/InfoRow";
import Screen from "@/components/ui/Screen";
import { formatCurrency, monthName, to12hLabel } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

/** Help: confirmation after sending a question (a payment problem when `paymentId` is set). */
export default function HelpSentScreen() {
  const router = useRouter();
  const { paymentId, topic } = useLocalSearchParams<{ paymentId?: string; topic?: string }>();
  const { user } = useActiveUser();
  const paymentsQuery = usePaymentsByUser(user?.uid);
  const payment = paymentId ? paymentsQuery.data?.find((p) => p.id === paymentId) : undefined;
  const [sentAt] = useState(() => new Date());

  return (
    <Screen
      footer={
        <View className="gap-2.5">
          <Button label="Volver a pagos" onPress={() => router.dismissTo("/private/payments")} />
          <Button label="Ir al inicio" variant="secondary" onPress={() => router.dismissTo("/private/home")} />
        </View>
      }
    >
      <View className="items-start gap-4 px-6 pt-16">
        <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-ink">
          <Ionicons name="send" size={30} color={palette.surface} />
        </View>
        {/* TODO(ayuda): the mock sends nothing; say so until it's real. */}
        <Chip label="Muestra · no se envió" tone="hidden" />
        <View>
          <AppText variant="display" className="text-[38px] leading-[42px]">
            Mensaje enviado
          </AppText>
          <AppText tone="muted" className="mt-2 text-[15px] leading-[21px]">
            La administración lo recibió por correo. Te respondemos a {user?.email}.
          </AppText>
        </View>
      </View>

      <Card padded={false} className="mx-3 mt-6 px-4 py-1">
        <InfoRow label="Tipo">{paymentId ? "Problema con un pago" : "Otra consulta"}</InfoRow>
        {payment ? (
          <InfoRow label="Pago">
            {`Mensualidad de ${monthName(payment.createdAt)} · ${formatCurrency(payment.totalAmount)}`}
          </InfoRow>
        ) : topic ? (
          <InfoRow label="Tema">{topic}</InfoRow>
        ) : null}
        <InfoRow label="Enviado" divider={false}>
          {`Hoy, ${to12hLabel(sentAt)}`}
        </InfoRow>
      </Card>

      <View className="mx-6 mt-3.5 flex-row gap-2">
        <Ionicons name="information-circle-outline" size={16} color={palette.muted} />
        <AppText tone="muted" className="flex-1 text-[13.5px] leading-[19px]">
          Si no ves la respuesta, revisa la carpeta de spam o correo no deseado.
        </AppText>
      </View>
    </Screen>
  );
}
