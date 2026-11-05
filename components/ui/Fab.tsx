import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import AppText from "./AppText";
import type { IconName } from "./IconButton";

type FabProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
};

/** Floating button at the bottom right of a list, to add to it. */
const Fab = ({ label, onPress, icon = "add" }: FabProps) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="absolute bottom-7 right-4 h-14 flex-row items-center gap-2 rounded-full bg-ink pl-[18px] pr-[22px] active:opacity-80"
      style={{ boxShadow: "0 10px 24px rgba(0, 0, 0, 0.22)" }}
    >
      <Ionicons name={icon} size={20} color={palette.surface} />
      <AppText variant="semibold" tone="inverse" className="text-[15px]">
        {label}
      </AppText>
    </Pressable>
  );
};

export default Fab;
