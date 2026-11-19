import palette from "@/constants/palette.json";
import { Switch, View } from "react-native";
import AppText from "./AppText";

type SwitchRowProps = {
  title: string;
  /** What the current value means. */
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

/** A setting that's on or off: title, explanation and switch. */
const SwitchRow = ({ title, hint, value, onChange, disabled = false }: SwitchRowProps) => {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1">
        <AppText variant="bold" className="text-[15px]">
          {title}
        </AppText>
        {hint && (
          <AppText tone="muted" className="text-[12.5px]">
            {hint}
          </AppText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: palette.line.strong, true: palette.ink }}
        thumbColor={palette.surface}
        accessibilityLabel={title}
      />
    </View>
  );
};

export default SwitchRow;
