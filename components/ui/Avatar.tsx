import { initials } from "@/constants/helpers";
import { Image, Pressable, View } from "react-native";
import AppText from "./AppText";

type AvatarProps = {
  name?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  size?: number;
  /** "light" = white circle (on black cards), "soft" = beige-gray, "dark" = black. */
  tone?: "light" | "soft" | "dark";
  onPress?: () => void;
  accessibilityLabel?: string;
};

const TONE = {
  light: { box: "bg-surface", text: "ink" },
  soft: { box: "bg-ground", text: "ink" },
  dark: { box: "bg-ink", text: "inverse" },
} as const;

/** Profile photo, or the person's initials when there's none. */
export default function Avatar({
  name,
  lastName,
  photoUrl,
  size = 40,
  tone = "soft",
  onPress,
  accessibilityLabel,
}: AvatarProps) {
  const circle = (
    <View
      className={`items-center justify-center overflow-hidden rounded-full ${TONE[tone].box}`}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={{ width: size, height: size }} />
      ) : (
        <AppText variant="bold" tone={TONE[tone].text} style={{ fontSize: size * 0.34 }}>
          {initials(name, lastName)}
        </AppText>
      )}
    </View>
  );
  if (!onPress) return circle;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={6}>
      {circle}
    </Pressable>
  );
}
