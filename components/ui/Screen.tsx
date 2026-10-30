import FormScrollView from "@/components/FormScrollView";
import type { ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type ScreenProps = {
  children: ReactNode;
  /** Bar pinned to the bottom with the screen's main action. */
  footer?: ReactNode;
  /** Scrolls by default; pass false when the screen renders its own list. */
  scroll?: boolean;
  /** Screen with text inputs: keeps the focused input above the keyboard. */
  form?: boolean;
  refreshControl?: ScrollViewProps["refreshControl"];
  /** Inside the tab navigator, which already covers the bottom safe area. */
  inTabs?: boolean;
  /** Extra classes for the scroll content (padding, gap…). */
  contentClassName?: string;
};

/** Page frame of the redesign: ground color, safe areas, scroll and footer. */
export default function Screen({
  children,
  footer,
  scroll = true,
  form = false,
  refreshControl,
  inTabs = false,
  contentClassName = "",
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const Scroller = form ? FormScrollView : ScrollView;
  const bottomEdge = !footer && !inTabs;

  return (
    <SafeAreaView edges={bottomEdge ? ["top", "bottom"] : ["top"]} className="flex-1 bg-ground">
      {scroll ? (
        <Scroller
          className="flex-1"
          contentContainerClassName={`pb-8 ${contentClassName}`}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </Scroller>
      ) : (
        <View className="flex-1">{children}</View>
      )}
      {footer && (
        <View
          className="border-t border-line bg-surface px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
        >
          {footer}
        </View>
      )}
    </SafeAreaView>
  );
}
