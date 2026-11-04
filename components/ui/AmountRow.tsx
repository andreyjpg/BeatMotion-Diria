import { formatCurrency } from "@/constants/helpers";
import { View } from "react-native";
import AppText from "./AppText";

type AmountRowProps = {
  label: string;
  amount: number;
  /** Gray text, for lines that add nothing (₡0 late fee). */
  muted?: boolean;
  /** Bold total line, with a bigger amount. */
  total?: boolean;
  /** Line under the row; off for the last one. */
  divider?: boolean;
};

/** "Concept ......... ₡46.000" line of a payment breakdown. */
export default function AmountRow({ label, amount, muted = false, total = false, divider = true }: AmountRowProps) {
  const tone = muted ? "muted" : "ink";
  return (
    <View className={`flex-row items-baseline justify-between gap-2.5 py-2.5 ${divider ? "border-b border-line-soft" : ""}`}>
      <AppText variant={total ? "bold" : "body"} tone={tone} className="flex-1 text-[14.5px]">
        {label}
      </AppText>
      <AppText variant={total ? "heavy" : "body"} tone={tone} className={total ? "text-[20px]" : "text-[14.5px]"}>
        {formatCurrency(amount)}
      </AppText>
    </View>
  );
}
