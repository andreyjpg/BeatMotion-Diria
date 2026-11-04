import { Pressable, View } from "react-native";
import AppText from "./AppText";

// A style, not a `shadow-*` class: Tailwind shadows use CSS variables, and
// NativeWind can't add those to a component after its first render (it crashes
// in development with "Couldn't find a LinkingContext context").
const SELECTED_SHADOW = { boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)" };
// Unselected segments get the track's color rather than none: Android drops
// the rounded corners when a background is added to a view after its first render.

type Segment<T extends string> = {
  value: T;
  label: string;
  /** Small number after the label (items in that segment). */
  count?: number;
};

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Read by screen readers: what the segments switch between. */
  accessibilityLabel: string;
  /** Selected segment: white on the track (views of a screen) or black (a form's choice). */
  tone?: "light" | "dark";
  /** Layout only (margins). */
  className?: string;
};

/** Gray track with one white segment selected: switches between views of a screen. */
export default function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
  tone = "light",
  className = "",
}: SegmentedControlProps<T>) {
  const dark = tone === "dark";
  const selectedText = dark ? "inverse" : "ink";

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      className={`flex-row gap-1 rounded-xl bg-control-track p-1 ${className}`}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            onPress={() => onChange(segment.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className={`h-[38px] flex-1 flex-row items-center justify-center gap-1.5 rounded-[9px] ${
              selected ? (dark ? "bg-ink" : "bg-surface") : "bg-control-track"
            }`}
            style={selected && !dark ? SELECTED_SHADOW : undefined}
          >
            <AppText variant="semibold" tone={selected ? selectedText : "neutral"} className="text-[13.5px]">
              {segment.label}
            </AppText>
            {segment.count !== undefined && (
              <AppText variant="label" tone={selected ? selectedText : "neutral"} className="text-[11px] tracking-normal">
                {segment.count}
              </AppText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
