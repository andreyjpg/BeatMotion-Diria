import { initials } from "@/constants/helpers";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, View } from "react-native";
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
const Avatar = ({
  name,
  lastName,
  photoUrl,
  size = 40,
  tone = "soft",
  onPress,
  accessibilityLabel,
}: AvatarProps) => {
  // A picture that can't load (deleted, or no connection) falls back to the initials.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // Signed links change every hour; keying on the file keeps the picture cached.
  const cacheKey = photoUrl?.split("?")[0];
  const circle = (
    <View
      className={`items-center justify-center overflow-hidden rounded-full ${TONE[tone].box}`}
      style={{ width: size, height: size }}
    >
      {photoUrl && photoUrl !== failedUrl ? (
        <Image source={{ uri: photoUrl, cacheKey }} style={{ width: size, height: size }} onError={() => setFailedUrl(photoUrl)} />
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
};

export default Avatar;
