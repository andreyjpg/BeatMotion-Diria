import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import palette from "@/constants/palette.json";
import { View } from "react-native";
import ReportCardTitle from "./ReportCardTitle";

export const BREAKDOWN_COLOR = {
  done: palette.ink,
  waiting: palette.sand.strong,
  notDone: palette.line.strong,
};

type ReportBreakdownProps = {
  title: string;
  note: string;
  parts: { label: string; value: number; color: string }[];
};

/** A total split into parts: one stacked bar and its legend. */
const ReportBreakdown = ({ title, note, parts }: ReportBreakdownProps) => (
  <Card className="gap-3">
    <ReportCardTitle title={title} note={note} />
    <View
      className="h-3.5 flex-row gap-0.5 overflow-hidden rounded-[5px] bg-ground"
      accessible
      accessibilityLabel={parts.map((part) => `${part.value} ${part.label}`).join(", ")}
    >
      {parts
        .filter((part) => part.value > 0)
        .map((part) => (
          <View key={part.label} style={{ flex: part.value, backgroundColor: part.color }} />
        ))}
    </View>
    <View className="gap-1.5">
      {parts.map((part) => (
        <View key={part.label} className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: part.color }} />
          <AppText className="flex-1 text-[13.5px]">{part.label}</AppText>
          <AppText variant="bold" className="text-[13.5px]">
            {part.value}
          </AppText>
        </View>
      ))}
    </View>
  </Card>
);

export default ReportBreakdown;
