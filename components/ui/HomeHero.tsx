import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import AppText from "./AppText";
import Avatar from "./Avatar";
import Logo from "./Logo";

type HomeHeroProps = {
  /** Small line above the title (date, role). */
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Stats row and/or a white button under the title. */
  children?: ReactNode;
};

/** Black card at the top of every home: logo, avatar, the day's headline. */
export default function HomeHero({ eyebrow, title, subtitle, children }: HomeHeroProps) {
  const router = useRouter();
  const { user } = useActiveUser();

  return (
    <View className="mx-3 mt-3 rounded-[26px] bg-ink p-5">
      <View className="flex-row items-center justify-between">
        <Logo size={26} tone="inverse" />
        <Avatar
          name={user?.name}
          lastName={user?.lastName}
          photoUrl={user?.photoURL}
          tone="light"
          onPress={() => router.navigate("/private/profile")}
          accessibilityLabel="Mi perfil"
        />
      </View>
      <AppText variant="label" tone="hero-muted" className="mt-6 text-[11px]">
        {eyebrow}
      </AppText>
      <AppText variant="display" tone="inverse" className="mt-2 text-[34px] leading-[37px]">
        {title}
      </AppText>
      {subtitle && (
        <AppText tone="hero-soft" className="mt-2 text-[14.5px] leading-[20px]">
          {subtitle}
        </AppText>
      )}
      {children}
    </View>
  );
}
