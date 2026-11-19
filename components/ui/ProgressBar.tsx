import { View } from "react-native";

type ProgressBarProps = {
  /** From 0 to 100. */
  percent: number;
  /** Height in px. */
  height?: number;
  /** Layout only (margins, flex-1). */
  className?: string;
};

/** Black bar over a light track. */
const ProgressBar = ({ percent, height = 12, className = "" }: ProgressBarProps) => {
  return (
    <View className={`overflow-hidden rounded bg-ground ${className}`} style={{ height }}>
      <View className="h-full rounded bg-ink" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </View>
  );
};

export default ProgressBar;
