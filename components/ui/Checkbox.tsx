import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Text next to the box; tapping it toggles too. */
  children: ReactNode;
  accessibilityLabel?: string;
};

export default function Checkbox({ checked, onChange, children, accessibilityLabel }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      aria-checked={checked}
      accessibilityLabel={accessibilityLabel}
      className="flex-row items-start gap-3"
    >
      <View
        className={`h-6 w-6 items-center justify-center rounded-[7px] border-2 ${
          checked ? "border-ink bg-ink" : "border-faint bg-surface"
        }`}
      >
        {checked && <Ionicons name="checkmark" size={16} color={palette.surface} />}
      </View>
      <View className="flex-1">{children}</View>
    </Pressable>
  );
}
