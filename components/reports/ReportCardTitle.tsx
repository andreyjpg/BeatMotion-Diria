import AppText from "@/components/ui/AppText";
import { View } from "react-native";

/** The title of a report's card, with an optional note on the right. */
const ReportCardTitle = ({ title, note }: { title: string; note?: string }) => (
  <View className="flex-row items-baseline justify-between gap-3">
    <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
      {title}
    </AppText>
    {note && (
      <AppText tone="muted" className="text-[12.5px]">
        {note}
      </AppText>
    )}
  </View>
);

export default ReportCardTitle;
