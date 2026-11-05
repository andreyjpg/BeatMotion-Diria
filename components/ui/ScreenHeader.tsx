import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import AppText from "./AppText";
import IconButton from "./IconButton";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Small uppercase text centered in the top bar (section or step). */
  eyebrow?: string;
  /** Back arrow (default), close cross, or nothing (tab screens). */
  nav?: "back" | "close" | false;
  /** Defaults to going back. */
  onNav?: () => void;
  /** Action on the right of the top bar (edit, next…). */
  right?: ReactNode;
  /** Beside the title (a person's avatar). */
  leading?: ReactNode;
  /** Between the top bar and the title (a form's steps). */
  belowBar?: ReactNode;
};

/** Top bar + big italic title used at the top of every screen. */
const ScreenHeader = ({
  title,
  subtitle,
  eyebrow,
  nav = "back",
  onNav,
  right,
  leading,
  belowBar,
}: ScreenHeaderProps) => {
  const router = useRouter();
  const hasBar = nav !== false || !!eyebrow || !!right;

  return (
    <View>
      {hasBar && (
        <View className="min-h-[56px] flex-row items-center justify-between px-4 pt-3">
          {nav ? (
            <IconButton
              icon={nav === "close" ? "close" : "chevron-back"}
              onPress={onNav ?? (() => router.back())}
              accessibilityLabel={nav === "close" ? "Cerrar" : "Volver"}
            />
          ) : (
            <View className="w-11" />
          )}
          {eyebrow ? (
            <AppText variant="label" tone="muted" className="text-[11px] flex-1 text-center mx-2" numberOfLines={1}>
              {eyebrow}
            </AppText>
          ) : (
            <View className="flex-1" />
          )}
          {right ?? <View className="w-11" />}
        </View>
      )}
      {belowBar}
      <View className={`flex-row items-center gap-3.5 px-5 ${hasBar ? "pt-3.5" : "pt-7"}`}>
        {leading}
        <View className="flex-1">
          <AppText variant="display" className="text-[34px] leading-[38px]">
            {title}
          </AppText>
          {subtitle && (
            <AppText tone="muted" className="text-[14.5px] leading-[20px] mt-1.5">
              {subtitle}
            </AppText>
          )}
        </View>
      </View>
    </View>
  );
};

export default ScreenHeader;
