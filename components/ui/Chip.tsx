import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import palette from "@/constants/palette.json";
import AppText, { type TextTone } from "./AppText";
import type { IconName } from "./IconButton";

export type ChipTone = "late" | "pending" | "ok" | "line" | "muted" | "hidden" | "inverse";

const TONE: Record<ChipTone, { box: string; text: TextTone; icon: string }> = {
  /** Late payment, overdue: the only red in the app. */
  late: { box: "bg-danger-soft", text: "danger", icon: palette.danger.DEFAULT },
  /** Waiting for something (payment due, request in review). */
  pending: { box: "bg-sand-soft", text: "sand", icon: palette.sand.ink },
  /** Done, approved, up to date, today. */
  ok: { box: "bg-ink", text: "inverse", icon: palette.surface },
  /** Neutral tag (category, type). */
  line: { box: "bg-surface border border-line-strong", text: "neutral", icon: palette.neutral.ink },
  /** Rejected, cancelled, inactive. */
  muted: { box: "bg-neutral", text: "neutral", icon: palette.neutral.ink },
  /** Hidden from students, draft. */
  hidden: { box: "bg-surface border border-dashed border-ink", text: "ink", icon: palette.ink },
  /** White tag on dark images or cards. */
  inverse: { box: "bg-surface", text: "ink", icon: palette.ink },
};

/** Chip tone for the statuses stored in the database (payments, enrollments, courses). */
export const statusTone = (status: string): ChipTone => {
  if (["ok", "approved", "autoApproved"].includes(status)) return "ok";
  if (status === "pending") return "pending";
  if (status === "late") return "late";
  if (["rejected", "canceled"].includes(status)) return "muted";
  return "line";
};

type ChipProps = {
  label: string;
  tone?: ChipTone;
  icon?: IconName;
};

/** Small uppercase status tag. */
export default function Chip({ label, tone = "line", icon }: ChipProps) {
  const look = TONE[tone];
  return (
    <View className={`h-[22px] flex-row items-center gap-1 self-start rounded-md px-2 ${look.box}`}>
      {icon && <Ionicons name={icon} size={11} color={look.icon} />}
      <AppText variant="label" tone={look.text} className="text-[10.5px]">
        {label}
      </AppText>
    </View>
  );
}
