import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { View } from "react-native";

// TODO(edades): MOCK with sample numbers, for the admin's Estadísticas. Needs
// the birth date on profiles; see TODO.md.
// Design: "Estadísticas" on the "Administración" canvas page.
const SAMPLE = [
  { label: "<18", n: 31 },
  { label: "18–25", n: 84 },
  { label: "26–35", n: 77 },
  { label: "36–45", n: 38 },
  { label: "46+", n: 18 },
];

const TALLEST_BAR = 80;
const MAX = Math.max(...SAMPLE.map((group) => group.n));

/** Bar chart: how many students in each age group. */
const AcademyAgesMock = () => {
  return (
    <Card className="mx-3 mt-2.5 gap-2.5">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Edades en la academia
        </AppText>
        <Chip label="Muestra" tone="hidden" />
      </View>
      <View
        className="h-[110px] flex-row items-end gap-2"
        accessible
        accessibilityLabel={`Ejemplo: ${SAMPLE.map((group) => `${group.n} de ${group.label}`).join(", ")}`}
      >
        {SAMPLE.map((group) => (
          <View key={group.label} className="flex-1 items-center gap-1">
            <AppText variant="bold" className="text-[12px]">
              {group.n}
            </AppText>
            <View className="w-full rounded-t-md bg-ink" style={{ height: Math.round((group.n / MAX) * TALLEST_BAR) }} />
          </View>
        ))}
      </View>
      <View className="flex-row gap-2">
        {SAMPLE.map((group) => (
          <AppText key={group.label} variant="label" tone="muted" className="flex-1 text-center text-[9.5px] tracking-normal">
            {group.label}
          </AppText>
        ))}
      </View>
    </Card>
  );
};

export default AcademyAgesMock;
