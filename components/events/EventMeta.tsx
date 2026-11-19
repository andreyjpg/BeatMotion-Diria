import AppText from "@/components/ui/AppText";
import type { IconName } from "@/components/ui/IconButton";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

/** One fact on an event's card: an icon and a short text. */
const EventMeta = ({ icon, text }: { icon: IconName; text: string }) => (
  <View className="flex-row items-center gap-1.5">
    <Ionicons name={icon} size={15} color={palette.muted} />
    <AppText tone="muted" className="text-[13px]">
      {text}
    </AppText>
  </View>
);

export default EventMeta;
