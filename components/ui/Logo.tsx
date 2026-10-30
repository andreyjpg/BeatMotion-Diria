import { View } from "react-native";
import AppText from "./AppText";

type LogoProps = {
  /** Font size of "DIRIÁ" in px. */
  size?: number;
  /** "inverse" for black backgrounds. */
  tone?: "ink" | "inverse";
  /** Shows "ACADEMIA DE BAILE" under the name. */
  tagline?: boolean;
};

/** The Diriá wordmark set in type (the PNG logo has a black square around it). */
export default function Logo({ size = 26, tone = "ink", tagline = false }: LogoProps) {
  return (
    <View accessibilityRole="header" accessibilityLabel="Diriá, academia de baile">
      <AppText variant="logo" tone={tone} style={{ fontSize: size, lineHeight: size * 1.05 }}>
        DIRIÁ
      </AppText>
      {tagline && (
        <AppText
          variant="label"
          tone={tone === "inverse" ? "hero-soft" : "muted"}
          style={{ fontSize: Math.max(7.5, size * 0.13), letterSpacing: size * 0.05, marginTop: size * 0.12 }}
        >
          Academia de baile
        </AppText>
      )}
    </View>
  );
}
