import AppText from "@/components/ui/AppText";
import Chip from "@/components/ui/Chip";
import palette from "@/constants/palette.json";
import { View } from "react-native";

// TODO(progreso del curso): MOCK with sample numbers, the big version for the
// course's screen. Same data as CourseProgressMock; see TODO.md.
// Design: "Mock · Progreso en el detalle del curso" on the "Funciones nuevas (mock)" canvas page.
const SAMPLE = "aamaaaatpppp";

const BLOCK = {
  a: { backgroundColor: palette.surface },
  m: { backgroundColor: palette.muted },
  t: { backgroundColor: palette.ink, borderWidth: 2.5, borderColor: palette.surface },
  p: { backgroundColor: palette.ink, borderWidth: 1.5, borderColor: palette.muted },
} as const;

const LEGEND = [
  { label: "Asististe 6", box: BLOCK.a },
  { label: "Faltaste 1", box: BLOCK.m },
  { label: "Quedan 5", box: BLOCK.p },
];

/** Black card: how far along the course is, one block per class. */
const CourseProgressCardMock = () => {
  return (
    <View className="mx-3 mt-2.5 gap-3.5 rounded-[22px] bg-ink p-[18px]">
      <View className="flex-row items-end justify-between">
        <View className="gap-1.5">
          <View className="flex-row items-center gap-2">
            <AppText variant="label" tone="hero-muted" className="text-[10px]">
              Progreso del curso
            </AppText>
            <Chip label="Muestra" tone="inverse" />
          </View>
          <AppText variant="heavy" tone="inverse" className="text-[44px] leading-[48px]">
            58 %
          </AppText>
        </View>
        <AppText tone="hero-soft" className="text-right text-[13.5px] leading-[19px]">
          {"Clase 8 de 12\nHoy"}
        </AppText>
      </View>
      <View
        className="h-4 flex-row gap-1"
        accessible
        accessibilityLabel="Ejemplo: 6 clases asistidas, 1 falta, hoy la clase 8, quedan 4 después de hoy"
      >
        {SAMPLE.split("").map((kind, i) => (
          <View key={i} className="flex-1 rounded" style={BLOCK[kind as keyof typeof BLOCK]} />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-3.5">
        {LEGEND.map((item) => (
          <View key={item.label} className="flex-row items-center gap-1.5">
            <View className="h-3 w-3 rounded-[3px]" style={item.box} />
            <AppText tone="hero-soft" className="text-[12.5px]">
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
      <AppText tone="hero-soft" className="border-t border-hero-line pt-3 text-[14px] leading-[20px]">
        Si vas a las 5 clases que quedan, terminas el curso con 92 % de asistencia.
      </AppText>
    </View>
  );
};

export default CourseProgressCardMock;
