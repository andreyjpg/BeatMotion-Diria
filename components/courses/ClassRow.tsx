import AppText from "@/components/ui/AppText";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

type ClassRowProps = {
  /** Position in the course (1 is the first class). */
  number: number;
  title: string;
  /** Second line: when it is, and anything else worth knowing. */
  detail: string;
  /** Today's class: its number goes on black. */
  highlighted?: boolean;
  onPress: () => void;
  /** What's on the right of the row (chip, button, arrow). */
  right?: ReactNode;
  /** Line under the row; off for the last one. */
  divider?: boolean;
};

/** One class in a course's list: number, title and date. */
const ClassRow = ({ number, title, detail, highlighted = false, onPress, right, divider = true }: ClassRowProps) => {
  return (
    <View className={`flex-row items-center gap-3 py-2.5 pl-3.5 pr-3 ${divider ? "border-b border-line-soft" : ""}`}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${detail}`}
        className="flex-1 flex-row items-center gap-3 active:opacity-70"
      >
        <View className={`h-9 w-9 items-center justify-center rounded-[10px] ${highlighted ? "bg-ink" : "bg-ground"}`}>
          <AppText variant="label-bold" tone={highlighted ? "inverse" : "ink"} className="text-[12px]">
            {String(number).padStart(2, "0")}
          </AppText>
        </View>
        <View className="flex-1">
          <AppText variant="bold" className="text-[15px]" numberOfLines={1}>
            {title}
          </AppText>
          <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
            {detail}
          </AppText>
        </View>
      </Pressable>
      <View>{right}</View>
    </View>
  );
};

export default ClassRow;
