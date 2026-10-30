import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

type CardProps = {
  children: ReactNode;
  /** Makes the whole card tappable. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Inner padding (default true); turn off for lists with their own row padding. */
  padded?: boolean;
  /** Layout and extra styling (margins, gap, flex direction…). */
  className?: string;
};

/** White rounded surface that groups related content. */
export default function Card({ children, onPress, accessibilityLabel, padded = true, className = "" }: CardProps) {
  const classes = `rounded-[18px] bg-surface ${padded ? "p-4" : ""} ${className}`;
  if (!onPress) return <View className={classes}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`${classes} active:opacity-80`}
    >
      {children}
    </Pressable>
  );
}
