import TransferDetailsMock from "@/components/mocks/TransferDetailsMock";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { SHOW_FEATURE_MOCKS } from "@/constants/featureMocks";
import { formatCurrency } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import type { PickedImage } from "@/hooks/storage/compressImage";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, View } from "react-native";
import StepBar from "./StepBar";

type PaymentStepProps = {
  total: number;
  /** "2 cursos + matrícula anual". */
  summary: string;
  /** What the student writes in the transfer: their name and the courses. */
  transferDescription: string;
  receipt: PickedImage | null;
  onPickReceipt: () => void;
  canSend: boolean;
  sending: boolean;
  onBack: () => void;
  onSend: () => void;
};

/** Step 3: how much to transfer and where, and the receipt. Nothing to pay skips all that. */
const PaymentStep = ({
  total,
  summary,
  transferDescription,
  receipt,
  onPickReceipt,
  canSend,
  sending,
  onBack,
  onSend,
}: PaymentStepProps) => {
  const needsReceipt = total > 0;

  return (
    <Screen
      footer={
        <View className="gap-2">
          <Button label="Enviar a revisión" onPress={onSend} loading={sending} disabled={!canSend} />
          <AppText tone="muted" className="text-center text-[12.5px]">
            {needsReceipt && !receipt
              ? "Sube el comprobante para poder enviar."
              : "Te avisamos cuando la academia apruebe tu matrícula."}
          </AppText>
        </View>
      }
    >
      <ScreenHeader
        onNav={onBack}
        eyebrow="Matrícula · paso 3 de 3"
        belowBar={<StepBar step={3} />}
        title={needsReceipt ? "Transfiere y envía" : "Confirma y envía"}
        subtitle={
          needsReceipt
            ? "Transfiere el monto y sube el comprobante."
            : "Tu Plan Diriá ya incluye estos cursos: no hay nada que pagar ni comprobante que subir."
        }
      />

      {needsReceipt ? (
        <>
          <View className="mx-3 mt-3.5 gap-1 rounded-[18px] bg-ink p-4">
            <AppText variant="label" tone="hero-muted" className="text-[10px]">
              Monto a transferir
            </AppText>
            <AppText variant="heavy" tone="inverse" className="text-[32px] leading-[36px]">
              {formatCurrency(total)}
            </AppText>
            <AppText tone="hero-soft" className="text-[12.5px]">
              {summary}
            </AppText>
          </View>

          {SHOW_FEATURE_MOCKS && <TransferDetailsMock />}

          <View className="mx-3 mt-2.5 gap-2 rounded-[18px] bg-sand-soft px-4 py-3.5">
            <AppText variant="bold" tone="sand" className="text-[14px]">
              En la descripción de la transferencia escribe:
            </AppText>
            <View className="rounded-xl bg-surface px-3 py-2.5">
              <AppText variant="semibold" className="text-[13.5px] leading-[19px]" selectable>
                {transferDescription}
              </AppText>
            </View>
          </View>

          {receipt ? (
            <Card className="mx-3 mt-2.5 flex-row items-center gap-3 p-3">
              <Image source={{ uri: receipt.uri }} className="h-[84px] w-16 rounded-[10px]" resizeMode="cover" />
              <View className="flex-1 gap-0.5">
                <AppText variant="bold" className="text-[15px]">
                  Comprobante listo
                </AppText>
                <AppText tone="muted" className="text-[12.5px]">
                  Listo para enviar
                </AppText>
              </View>
              <Button label="Cambiar" variant="secondary" size="sm" onPress={onPickReceipt} disabled={sending} />
            </Card>
          ) : (
            <Pressable
              onPress={onPickReceipt}
              accessibilityRole="button"
              className="mx-3 mt-2.5 h-28 items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-faint bg-ground active:opacity-70"
            >
              <Ionicons name="cloud-upload-outline" size={26} color={palette.ink} />
              <AppText variant="bold" className="text-[15px]">
                Subir comprobante
              </AppText>
              <AppText tone="muted" className="text-[12.5px]">
                Captura de pantalla o foto
              </AppText>
            </Pressable>
          )}
        </>
      ) : (
        <Card className="mx-3 mt-3.5 gap-1">
          <AppText variant="label" tone="muted" className="text-[10px]">
            Vas a sumar
          </AppText>
          <AppText variant="bold" className="text-[16px] leading-[21px]">
            {summary}
          </AppText>
        </Card>
      )}
    </Screen>
  );
};

export default PaymentStep;
