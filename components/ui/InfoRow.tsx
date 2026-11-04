import type { ReactNode } from "react";
import { View } from "react-native";
import AppText from "./AppText";

type InfoRowProps = {
  label: string;
  /** Text, or a chip or anything else on the right. */
  children: ReactNode;
  /** Line under the row; off for the last one. */
  divider?: boolean;
};

/** "LABEL ........ value" row of a summary card. */
export default function InfoRow({ label, children, divider = true }: InfoRowProps) {
  return (
    <View className={`flex-row items-center justify-between gap-2.5 py-2.5 ${divider ? "border-b border-line-soft" : ""}`}>
      <AppText variant="label" tone="muted" className="text-[10px]">
        {label}
      </AppText>
      {typeof children === "string" ? (
        <AppText variant="semibold" className="flex-1 text-right text-[14.5px]">
          {children}
        </AppText>
      ) : (
        children
      )}
    </View>
  );
}
