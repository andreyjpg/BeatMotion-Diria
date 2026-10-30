import { Pressable, View } from "react-native";
import AppText from "./AppText";

type SectionHeaderProps = {
  title: string;
  /** Link on the right ("Ver todo"). */
  action?: { label: string; onPress: () => void };
  /** Small text on the right instead of a link ("12 clases"). */
  note?: string;
};

/** Uppercase label that opens a block of content. */
export default function SectionHeader({ title, action, note }: SectionHeaderProps) {
  return (
    <View className="flex-row items-baseline justify-between px-5 pb-2.5 pt-6">
      <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
        {title}
      </AppText>
      {action ? (
        <Pressable onPress={action.onPress} accessibilityRole="link" hitSlop={8}>
          <AppText variant="semibold" className="text-[13.5px] underline">
            {action.label}
          </AppText>
        </Pressable>
      ) : (
        note && (
          <AppText variant="label" tone="muted" className="text-[10.5px]">
            {note}
          </AppText>
        )
      )}
    </View>
  );
}
