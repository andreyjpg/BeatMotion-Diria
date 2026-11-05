import ImageModal from "@/components/ImageModal";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import IconButton from "@/components/ui/IconButton";
import InfoRow from "@/components/ui/InfoRow";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatCurrency, LATE_FEE_GRACE_DAYS, lateFeePerDay } from "@/constants/helpers";
import { useFares } from "@/hooks/fares/useFares";
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, View, type ScrollViewInstance } from "react-native";
import StepBar from "./StepBar";

// The academy's administrative notice, in force since September 2026.
const POSTERS = [
  {
    source: require("../../assets/images/rules/ausencias.webp"),
    label: "Comunicado administrativo: ausencias y reposición de clases",
  },
  {
    source: require("../../assets/images/rules/pagos.webp"),
    label: "Comunicado administrativo: congelamiento, cancelación, reingreso y pagos",
  },
];

const POSTER_WIDTH = 300;
const POSTER_GAP = 10;

type RulesStepProps = {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onContinue: () => void;
};

/** Step 1: the academy's rules, which the student accepts before choosing courses. */
const RulesStep = ({ accepted, onAcceptedChange, onContinue }: RulesStepProps) => {
  const faresQuery = useFares();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState<number | null>(null);
  const zoomedPoster = zoomed === null ? undefined : POSTERS[zoomed];

  const goTo = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * (POSTER_WIDTH + POSTER_GAP), animated: true });
    setIndex(next);
  };

  return (
    <Screen
      footer={
        <View className="gap-3">
          <Checkbox checked={accepted} onChange={onAcceptedChange}>
            <AppText variant="semibold" className="pt-0.5 text-[14.5px]">
              Leí y acepto las reglas de la academia
            </AppText>
          </Checkbox>
          <Button label="Continuar" onPress={onContinue} disabled={!accepted} />
        </View>
      }
    >
      <ScreenHeader
        nav="close"
        eyebrow="Matrícula · paso 1 de 3"
        belowBar={<StepBar step={1} />}
        title="Antes de empezar"
        subtitle="Estas son las reglas de pagos, ausencias y reposiciones."
      />

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={POSTER_WIDTH + POSTER_GAP}
        decelerationRate="fast"
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / (POSTER_WIDTH + POSTER_GAP)))
        }
        className="mt-4"
        contentContainerClassName="gap-2.5 px-5"
      >
        {POSTERS.map((poster, position) => (
          <Pressable
            key={poster.label}
            onPress={() => setZoomed(position)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`${poster.label}. Toca para ampliar`}
            className="h-[340px] overflow-hidden rounded-[18px] bg-ink"
            style={{ width: POSTER_WIDTH }}
          >
            <Image source={poster.source} className="h-full w-full" resizeMode="contain" />
          </Pressable>
        ))}
      </ScrollView>

      <View className="flex-row items-center justify-between px-5 pt-2.5">
        <AppText tone="muted" className="text-[12.5px]">
          Toca la imagen para ampliarla
        </AppText>
        <View className="flex-row items-center gap-2">
          <IconButton
            icon="chevron-back"
            tone="outline"
            size={36}
            onPress={() => goTo(index - 1)}
            disabled={index === 0}
            accessibilityLabel="Imagen anterior"
          />
          <AppText variant="label" className="min-w-[34px] text-center">
            {`${index + 1} / ${POSTERS.length}`}
          </AppText>
          <IconButton
            icon="chevron-forward"
            tone="outline"
            size={36}
            onPress={() => goTo(index + 1)}
            disabled={index === POSTERS.length - 1}
            accessibilityLabel="Imagen siguiente"
          />
        </View>
      </View>

      <Card className="mx-3 mt-3.5 py-1.5">
        <InfoRow label="Pago de mensualidad">15 o 30 de cada mes</InfoRow>
        <InfoRow label={`Atraso después de ${LATE_FEE_GRACE_DAYS} días`}>
          {`${formatCurrency(lateFeePerDay(faresQuery.data))} por día`}
        </InfoRow>
        <InfoRow label="Avisar ausencias" divider={false}>
          8 días antes del pago
        </InfoRow>
      </Card>

      <ImageModal
        isVisible={!!zoomedPoster}
        imageSelected={zoomedPoster ? (Image.resolveAssetSource(zoomedPoster.source)?.uri ?? "") : ""}
        toggleVisibility={() => setZoomed(null)}
      />
    </Screen>
  );
};

export default RulesStep;
