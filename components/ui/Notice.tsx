import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { View } from "react-native";
import AppText, { type TextTone } from "./AppText";
import type { IconName } from "./IconButton";

type NoticeTone = "late" | "pending" | "neutral";

const TONE: Record<NoticeTone, { box: string; text: TextTone; icon: string }> = {
  /** Late payment: the only red, like the late chip. */
  late: { box: "bg-danger-soft", text: "danger", icon: palette.danger.DEFAULT },
  /** Something to keep in mind before going on (a date, a payment first). */
  pending: { box: "bg-sand-soft", text: "sand", icon: palette.sand.ink },
  /** A plain explanation. */
  neutral: { box: "bg-neutral", text: "neutral", icon: palette.neutral.ink },
};

type NoticeProps = {
  tone: NoticeTone;
  children: string;
  icon?: IconName;
  /** Buttons under the text ("Ir a pagar"). */
  action?: ReactNode;
  /** Layout only (margins). */
  className?: string;
};

/** Colored box with an icon and a short message, for warnings inside a screen. */
const Notice = ({ tone, children, icon = "information-circle-outline", action, className = "" }: NoticeProps) => {
  const look = TONE[tone];
  return (
    <View
      accessibilityRole={tone === "late" ? "alert" : undefined}
      className={`gap-3 rounded-[14px] px-3.5 py-3 ${look.box} ${className}`}
    >
      <View className="flex-row items-start gap-2.5">
        <Ionicons name={icon} size={20} color={look.icon} />
        <AppText tone={look.text} className="flex-1 text-[13.5px] leading-[19px]">
          {children}
        </AppText>
      </View>
      {action}
    </View>
  );
};

export default Notice;
