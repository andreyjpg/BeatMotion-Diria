import AppText from "@/components/ui/AppText";
import Chip from "@/components/ui/Chip";
import palette from "@/constants/palette.json";
import { View } from "react-native";

// TODO(progreso del curso): MOCK with sample numbers. Real version (own branch):
// - Only for courses with a start AND end date (courses have no end date yet:
//   needs a migration + the course form).
// - Total classes = the course's weekday between those dates; given = those
//   before today; attended/missed from the student's attendance rows.
// - Progress = given / total; attendance = attended / given; with no end date
//   show attendance only, without the bar.
// Design: "1 · Progreso del curso" on the "Funciones nuevas (mock)" canvas page.
const SAMPLE = "aamaaaatpppp";

const BLOCK = {
  a: { backgroundColor: palette.ink },
  m: { backgroundColor: palette.line.strong },
  t: { backgroundColor: palette.surface, borderWidth: 2, borderColor: palette.ink },
  p: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line.strong },
} as const;

/** One block per class: attended (black), missed (gray), today, still to come. */
export default function CourseProgressMock() {
  return (
    <View className="gap-2 border-t border-line-soft pt-3">
      <View className="flex-row items-center justify-between gap-2">
        <AppText variant="bold" className="text-[14px]">
          Clase 8 de 12 · hoy
        </AppText>
        <Chip label="Muestra" tone="hidden" />
      </View>
      <View
        className="h-2.5 flex-row gap-[3px]"
        accessible
        accessibilityLabel="Ejemplo: 6 clases asistidas, 1 falta, hoy la clase 8, quedan 4 después de hoy"
      >
        {SAMPLE.split("").map((kind, i) => (
          <View key={i} className="flex-1 rounded-[3px]" style={BLOCK[kind as keyof typeof BLOCK]} />
        ))}
      </View>
      <AppText tone="muted" className="text-[12.5px]">
        Asistencia 86 % (6 de 7) · quedan 5 clases
      </AppText>
    </View>
  );
}
