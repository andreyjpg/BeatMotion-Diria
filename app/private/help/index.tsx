import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import type { IconName } from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import palette from "@/constants/palette.json";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

// TODO(ayuda): sample answers; confirm the real ones with the academy.
const FAQ = [
  {
    q: "¿Cuándo debo pagar la mensualidad?",
    a: "En la fecha límite que ves en Pagos. Después de unos días de gracia se suma un recargo por cada día de atraso.",
  },
  {
    q: "¿Cómo repongo una clase que perdí?",
    a: "En otro grupo del mismo nivel, según disponibilidad, o con una clase privada de reposición para alumnos activos.",
  },
  {
    q: "¿Puedo congelar mi mensualidad?",
    a: "Sí. Con una cuota mensual conservas tu cupo, y al volver pagas solo la mensualidad, sin matrícula.",
  },
  {
    q: "Olvidé mi contraseña",
    a: "En la pantalla de inicio de sesión toca «¿Olvidaste tu contraseña?» y te enviamos un código a tu correo.",
  },
];

type OptionProps = {
  icon: IconName;
  title: string;
  text: string;
  dark?: boolean;
  onPress?: () => void;
};

const Option = ({ icon, title, text, dark = false, onPress }: OptionProps) => (
  <Card onPress={onPress} accessibilityLabel={title} className={`flex-row items-center gap-3.5 ${onPress ? "" : "opacity-50"}`}>
    <View className={`h-12 w-12 items-center justify-center rounded-[14px] ${dark ? "bg-ink" : "bg-sand"}`}>
      <Ionicons name={icon} size={22} color={dark ? palette.surface : palette.ink} />
    </View>
    <View className="flex-1 gap-0.5">
      <AppText variant="bold" className="text-[16.5px]">
        {title}
      </AppText>
      <AppText tone="muted" className="text-[13px] leading-[18px]">
        {text}
      </AppText>
    </View>
    {onPress && <Ionicons name="chevron-forward" size={18} color={palette.ink} />}
  </Card>
);

/** Help center: write to the academy about a payment or anything else, plus common questions. */
export default function HelpScreen() {
  const router = useRouter();
  const { user } = useActiveUser();
  const paymentsQuery = usePaymentsByUser(user?.uid);
  const [open, setOpen] = useState<number | null>(0);

  const payments = paymentsQuery.data ?? [];
  // The payment most likely to have a problem: one still in review or rejected.
  const payment = payments.find((p) => p.status !== "approved") ?? payments[0];

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Ayuda y soporte"
        title="¿En qué te ayudamos?"
        subtitle={user?.email ? `Tu mensaje llega a la administración y te respondemos a ${user.email}.` : undefined}
      />
      <View className="gap-2.5 px-3 pt-[18px]">
        <Option
          icon="card-outline"
          dark
          title="Problema con un pago"
          text={
            payment
              ? "Pago rechazado, monto distinto o comprobante que no aparece."
              : "Todavía no has enviado ningún pago."
          }
          onPress={
            payment
              ? () => router.push({ pathname: "/private/help/payment/[paymentId]", params: { paymentId: payment.id } })
              : undefined
          }
        />
        <Option
          icon="chatbubble-ellipses-outline"
          title="Otra consulta"
          text="Clases, horarios, tu cuenta o la app."
          onPress={() => router.push("/private/help/general")}
        />
      </View>

      <SectionHeader title="Preguntas frecuentes" />
      <Card padded={false} className="mx-3 py-1">
        {FAQ.map((item, i) => {
          const expanded = open === i;
          return (
            <View key={item.q} className={i < FAQ.length - 1 ? "border-b border-line-soft" : ""}>
              <Pressable
                onPress={() => setOpen(expanded ? null : i)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                className="flex-row items-center gap-2.5 px-4 py-3.5"
              >
                <AppText variant="semibold" className="flex-1 text-[15px]">
                  {item.q}
                </AppText>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={palette.ink} />
              </Pressable>
              {expanded && (
                <AppText tone="muted" className="px-4 pb-3.5 text-[14px] leading-[21px]">
                  {item.a}
                </AppText>
              )}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
