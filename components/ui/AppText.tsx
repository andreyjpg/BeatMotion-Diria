import { Text, type TextProps } from "react-native";

// React Native has no inherited font, so every text in the redesign goes
// through this component to get the Archivo / JetBrains Mono families.
const VARIANT = {
  body: "font-body",
  medium: "font-body-medium",
  semibold: "font-body-semibold",
  bold: "font-body-bold",
  heavy: "font-body-heavy tracking-[-0.3px]",
  /** Italic headlines (screen titles, hero cards). */
  display: "font-display tracking-[-0.6px]",
  /** The Diriá wordmark. */
  logo: "font-logo tracking-[-0.5px]",
  /** Small uppercase labels (section titles, eyebrows, dates). */
  label: "font-mono uppercase tracking-[1px]",
  "label-bold": "font-mono-bold uppercase tracking-[1px]",
} as const;

const TONE = {
  ink: "text-ink",
  muted: "text-muted",
  faint: "text-faint",
  inverse: "text-surface",
  "hero-muted": "text-hero-muted",
  "hero-soft": "text-hero-soft",
  danger: "text-danger",
  sand: "text-sand-ink",
  neutral: "text-neutral-ink",
} as const;

export type TextVariant = keyof typeof VARIANT;
export type TextTone = keyof typeof TONE;

type AppTextProps = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  /** Size, spacing and alignment. Pick the font with `variant` and the color with `tone`. */
  className?: string;
};

export default function AppText({
  variant = "body",
  tone = "ink",
  className = "",
  ...props
}: AppTextProps) {
  return <Text className={`${VARIANT[variant]} ${TONE[tone]} ${className}`} {...props} />;
}
