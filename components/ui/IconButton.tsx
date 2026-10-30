import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable } from "react-native";

export type IconName = ComponentProps<typeof Ionicons>["name"];

const TONE = {
  light: { box: "bg-surface", icon: palette.ink },
  outline: { box: "bg-surface border-[1.5px] border-field-line", icon: palette.ink },
  dark: { box: "bg-ink", icon: palette.surface },
} as const;

type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  /** Read by screen readers: the button has no visible text. */
  accessibilityLabel: string;
  tone?: keyof typeof TONE;
  /** Diameter in px; 44 keeps the touch target comfortable. */
  size?: number;
  iconColor?: string;
  disabled?: boolean;
};

/** Round button with only an icon (back, close, edit, delete…). */
export default function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = "light",
  size = 44,
  iconColor,
  disabled,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      className={`items-center justify-center rounded-full active:opacity-70 ${TONE[tone].box}`}
      style={{ width: size, height: size, opacity: disabled ? 0.4 : 1 }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.45)} color={iconColor ?? TONE[tone].icon} />
    </Pressable>
  );
}
