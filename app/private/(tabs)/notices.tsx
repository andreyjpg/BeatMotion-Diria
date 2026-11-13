import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { formatDayMonth, formatShortDate, to12hLabel } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { Notification } from "@/hooks/notifications/notificationSchemas";
import { useMarkNotificationAsSeen } from "@/hooks/notifications/useMarkNotificationAsSeen";
import { useMyNotifications } from "@/hooks/notifications/useMyNotifications";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, RefreshControl, SectionList, View } from "react-native";

const GROUPS = ["Hoy", "Esta semana", "Antes"] as const;
type Group = (typeof GROUPS)[number];

const groupOf = (date: Date, now: Date): Group => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= today) return "Hoy";
  // Weeks start on Monday.
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return date >= monday ? "Esta semana" : "Antes";
};

const WHEN: Record<Group, (date: Date) => string> = {
  Hoy: to12hLabel,
  "Esta semana": (date) => formatShortDate(date).split(" ").slice(0, 2).join(" "),
  Antes: formatDayMonth,
};

const toSections = (notifications: Notification[]) => {
  const now = new Date();
  return GROUPS.map((title) => ({
    title,
    data: notifications.filter((item) => groupOf(item.createdAt, now) === title),
  })).filter((section) => section.data.length > 0);
};

/** The user's notifications, grouped by when they arrived. */
const MyNotifications = () => {
  const markNotification = useMarkNotificationAsSeen();
  const notificationsQuery = useMyNotifications();

  const unread = notificationsQuery.data?.filter((item) => !item.read).length ?? 0;

  return (
    <Screen scroll={false} inTabs>
      <ScreenHeader
        nav={false}
        title="Avisos"
        subtitle={
          notificationsQuery.data &&
          (unread === 0
            ? "Todo leído"
            : `${unread} sin leer · toca uno para marcarlo como leído`)
        }
      />
      <DataLoader query={notificationsQuery} emptyMessage="No tienes avisos todavía.">
        {(notifications, isRefetching, refetch) => (
          <SectionList
            sections={toSections(notifications)}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled={false}
            contentContainerClassName="pb-6"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
            renderItem={({ item, section }) => (
              <Pressable
                onPress={() => markNotification.mutate(item.id)}
                disabled={item.read}
                accessibilityRole="button"
                accessibilityLabel={item.read ? item.title : `${item.title}, sin leer`}
                // Ground instead of no background when read: Android drops the
                // rounded corners when a background is added after the first render.
                className={`mx-3 mb-2 flex-row items-start gap-3 rounded-2xl p-3.5 active:opacity-80 ${
                  item.read ? "bg-ground" : "bg-surface"
                }`}
              >
                <View className={`h-10 w-10 items-center justify-center rounded-xl ${item.read ? "bg-neutral" : "bg-ink"}`}>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={item.read ? palette.neutral.ink : palette.surface}
                  />
                </View>
                <View className="flex-1 gap-1">
                  <View className="flex-row items-baseline justify-between gap-2">
                    <AppText variant={item.read ? "semibold" : "heavy"} className="flex-1 text-[15px]">
                      {item.title}
                    </AppText>
                    {/* Today's notices show a time, which keeps "p. m." in small letters. */}
                    <AppText variant={section.title === "Hoy" ? "mono" : "label"} tone="muted" className="text-[10px]">
                      {WHEN[section.title](item.createdAt)}
                    </AppText>
                  </View>
                  <AppText tone={item.read ? "muted" : "ink"} className="text-[13.5px] leading-[19px]">
                    {item.content}
                  </AppText>
                </View>
                {!item.read && <View className="mt-1.5 h-2.5 w-2.5 rounded-full bg-danger" />}
              </Pressable>
            )}
          />
        )}
      </DataLoader>
    </Screen>
  );
};

export default MyNotifications;
