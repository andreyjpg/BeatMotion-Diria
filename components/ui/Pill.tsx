import { Pressable } from "react-native";
import AppText from "./AppText";

type PillProps = {
  label: string;
  /** Small number after the label (items it filters to). */
  count?: number;
  selected: boolean;
  onPress: () => void;
};

/** Round option for filters and short choices: black when selected. */
const Pill = ({ label, count, selected, onPress }: PillProps) => {
  const tone = selected ? "inverse" : "ink";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className={`h-[38px] flex-row items-center gap-1.5 rounded-full border-[1.5px] px-3.5 ${
        selected ? "border-ink bg-ink" : "border-line-strong bg-surface"
      }`}
    >
      <AppText variant="semibold" tone={tone} className="text-[13.5px]">
        {label}
      </AppText>
      {count !== undefined && (
        <AppText variant="label" tone={tone} className="text-[11px] tracking-normal">
          {count}
        </AppText>
      )}
    </Pressable>
  );
};

export default Pill;
