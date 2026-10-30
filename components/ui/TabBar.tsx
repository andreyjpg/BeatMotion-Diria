import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/tabs";
import { Pressable, View } from "react-native";
import AppText from "./AppText";
import type { IconName } from "./IconButton";

export type TabItem = {
  /** Route file name inside app/private/(tabs). */
  name: string;
  label: string;
  icon: IconName;
  /** Red dot (unread notices). */
  badge?: boolean;
};

type TabBarProps = BottomTabBarProps & { items: TabItem[] };

/** Bottom navigation: only the tabs of the signed-in role, in `items` order. */
export default function TabBar({ state, navigation, insets, items }: TabBarProps) {
  const activeName = state.routes[state.index]?.name;

  return (
    <View
      className="flex-row border-t border-line bg-surface px-1.5 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      {items.map((item) => {
        const route = state.routes.find((r) => r.name === item.name);
        if (!route) return null;
        const focused = activeName === item.name;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={item.name}
            onPress={onPress}
            accessibilityRole="tab"
            aria-selected={focused}
            accessibilityLabel={item.badge ? `${item.label}, hay avisos sin leer` : item.label}
            className="flex-1 items-center gap-1 py-0.5"
          >
            <View className={`h-[30px] w-[54px] items-center justify-center rounded-full ${focused ? "bg-ink" : ""}`}>
              <Ionicons name={item.icon} size={21} color={focused ? palette.surface : palette.muted} />
              {item.badge && (
                <View className="absolute right-3 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-danger" />
              )}
            </View>
            <AppText variant="semibold" tone={focused ? "ink" : "muted"} className="text-[11px]">
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
