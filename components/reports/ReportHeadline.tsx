import AppText from "@/components/ui/AppText";
import { View } from "react-native";

/** The report's main number, on a black card. */
const ReportHeadline = ({ label, value }: { label: string; value: string | number }) => (
  <View className="rounded-[22px] bg-ink p-[18px]">
    <AppText variant="label" tone="hero-muted" className="text-[10px]">
      {label}
    </AppText>
    <AppText
      variant="heavy"
      tone="inverse"
      className="mt-2 text-[44px] leading-[48px]"
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {value}
    </AppText>
  </View>
);

export default ReportHeadline;
