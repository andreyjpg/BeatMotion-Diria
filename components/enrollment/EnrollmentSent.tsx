import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Screen from "@/components/ui/Screen";
import { formatCurrency, to12hLabel } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { View } from "react-native";

const TimelineRow = ({
  marker,
  title,
  note,
  upcoming = false,
}: {
  marker: ReactNode;
  title: string;
  note: string;
  upcoming?: boolean;
}) => (
  <View className="flex-row items-start gap-3">
    {marker}
    <View className="flex-1">
      <AppText variant="bold" tone={upcoming ? "muted" : "ink"} className="text-[14.5px]">
        {title}
      </AppText>
      <AppText tone="muted" className="text-[12.5px]">
        {note}
      </AppText>
    </View>
  </View>
);

type EnrollmentSentProps = {
  courseTitles: string[];
  total: number;
  sentAt: Date;
  onDone: () => void;
};

/** After sending: what was requested and what happens next. */
const EnrollmentSent = ({ courseTitles, total, sentAt, onDone }: EnrollmentSentProps) => {
  return (
    <Screen footer={<Button label="Ir al inicio" onPress={onDone} />}>
      <View className="items-start gap-[18px] px-6 pt-12">
        <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-ink">
          <Ionicons name="checkmark" size={36} color={palette.surface} />
        </View>
        <View>
          <AppText variant="display" accessibilityRole="header" className="text-[38px] leading-[42px]">
            Solicitud enviada
          </AppText>
          <AppText tone="muted" className="mt-2 text-[15px] leading-[22px]">
            {total > 0
              ? "La academia revisará tu comprobante. Te enviamos un aviso cuando quede aprobada."
              : "La academia revisará tu solicitud. Te enviamos un aviso cuando quede aprobada."}
          </AppText>
        </View>
      </View>

      <Card className="mx-3 mt-6 gap-2.5">
        <View className="flex-row items-center justify-between">
          <AppText variant="label" tone="muted" className="text-[10px]">
            Tu matrícula
          </AppText>
          <Chip label="En revisión" tone="pending" />
        </View>
        <View className="flex-row items-end justify-between gap-2.5">
          <View className="flex-1 gap-0.5">
            {courseTitles.map((title) => (
              <AppText key={title} variant="bold" className="text-[16px]">
                {title}
              </AppText>
            ))}
          </View>
          {total > 0 && (
            <AppText variant="heavy" className="text-[24px] leading-[28px]">
              {formatCurrency(total)}
            </AppText>
          )}
        </View>
      </Card>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <TimelineRow
          marker={
            <View className="h-[26px] w-[26px] items-center justify-center rounded-full bg-ink">
              <Ionicons name="checkmark" size={14} color={palette.surface} />
            </View>
          }
          title="Enviada"
          note={`Hoy, ${to12hLabel(sentAt)}`}
        />
        <TimelineRow
          marker={
            <View className="h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-ink">
              <View className="h-2 w-2 rounded-full bg-ink" />
            </View>
          }
          title="En revisión"
          note={total > 0 ? "La administración verifica el pago" : "La administración revisa tu solicitud"}
        />
        <TimelineRow
          marker={<View className="h-[26px] w-[26px] rounded-full border-2 border-line-strong" />}
          title="Aprobada"
          note="Ves tus clases en Mis cursos"
          upcoming
        />
      </Card>
    </Screen>
  );
};

export default EnrollmentSent;
