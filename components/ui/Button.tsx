import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, View } from "react-native";
import AppText from "./AppText";
import type { IconName } from "./IconButton";

const VARIANT = {
  /** Main action of the screen: one per screen. */
  primary: { box: "bg-ink", text: "inverse", icon: palette.surface },
  secondary: { box: "bg-control", text: "ink", icon: palette.ink },
  outline: { box: "bg-surface border-[1.5px] border-ink", text: "ink", icon: palette.ink },
  danger: { box: "bg-surface border-[1.5px] border-danger-line", text: "danger", icon: palette.danger.DEFAULT },
  /** White button on black cards. */
  inverse: { box: "bg-surface", text: "ink", icon: palette.ink },
} as const;

const SIZE = {
  md: { box: "h-[52px] px-5 rounded-[14px]", text: "text-[15px]", icon: 20 },
  sm: { box: "h-10 px-3.5 rounded-xl", text: "text-[14px]", icon: 18 },
} as const;

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Layout only (flex-1, margins, self-start…). */
  className?: string;
};

export default function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  className = "",
}: ButtonProps) {
  const inactive = disabled || loading;
  const look = VARIANT[variant];
  const box = disabled ? "bg-line-strong" : look.box;
  const textTone = disabled ? "muted" : look.text;
  const iconColor = disabled ? palette.muted : look.icon;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`flex-row items-center justify-center gap-2 active:opacity-80 ${SIZE[size].box} ${box} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon && <Ionicons name={icon} size={SIZE[size].icon} color={iconColor} />}
          <AppText variant="semibold" tone={textTone} className={SIZE[size].text}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}
