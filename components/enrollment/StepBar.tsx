import AppText from "@/components/ui/AppText";
import { View } from "react-native";

const STEPS = ["Reglas", "Cursos", "Pago"];

/** The enrollment's three steps, filled up to the current one. */
const StepBar = ({ step }: { step: 1 | 2 | 3 }) => {
  return (
    <View
      className="flex-row gap-1.5 px-5 pt-2"
      accessible
      accessibilityLabel={`Paso ${step} de ${STEPS.length}: ${STEPS[step - 1]}`}
    >
      {STEPS.map((label, index) => {
        const reached = index < step;
        return (
          <View key={label} className="flex-1 gap-1.5">
            <View className={`h-1 rounded-sm ${reached ? "bg-ink" : "bg-line-strong"}`} />
            <AppText variant="label" tone={reached ? "ink" : "muted"} className="text-[10px]">
              {label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
};

export default StepBar;
