import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import AppText from "./AppText";
import type { IconName } from "./IconButton";

type ShortcutCardProps = {
  label: string;
  sub: string;
  icon: IconName;
  onPress: () => void;
};

/** Tile of the "Accesos" grid on the home screens (two per row). */
export default function ShortcutCard({ label, sub, icon, onPress }: ShortcutCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${sub}`}
      className="min-h-[72px] flex-row items-center gap-3 rounded-[18px] bg-surface p-3.5 active:opacity-80"
      style={{ width: "48.5%" }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-sand">
        <Ionicons name={icon} size={20} color={palette.ink} />
      </View>
      <View className="flex-1">
        <AppText variant="bold" className="text-[15px]" numberOfLines={1}>
          {label}
        </AppText>
        <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
          {sub}
        </AppText>
      </View>
    </Pressable>
  );
}
