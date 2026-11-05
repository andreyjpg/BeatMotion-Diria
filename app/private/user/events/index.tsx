import DataLoader from "@/components/DataLoader";
import EventMeta from "@/components/events/EventMeta";
import EventSpots from "@/components/events/EventSpots";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Pill from "@/components/ui/Pill";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { monthShort, to12hLabel, weekdayShort } from "@/constants/helpers";
import type { Event } from "@/hooks/events/schema";
import { useEvents } from "@/hooks/events/useEvents";
import { formatEventPrice } from "@/hooks/events/utils";
import { useMyActiveSignupEventIds } from "@/hooks/eventSignups/useMyActiveSignupEventIds";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Image, RefreshControl, View } from "react-native";

type Tab = "proximos" | "mes" | "pasados";

const TABS: { value: Tab; label: string }[] = [
  { value: "proximos", label: "Próximos" },
  { value: "mes", label: "Este mes" },
  { value: "pasados", label: "Pasados" },
];

const EMPTY: Record<Tab, string> = {
  proximos: "No hay eventos próximos.",
  mes: "No hay eventos este mes.",
  pasados: "No hay eventos pasados en los últimos 6 meses.",
};

/** Published events, to open one and sign up. */
const EventsList = () => {
  const router = useRouter();
  const eventsQuery = useEvents({ includePrivate: true }); // published + include members-only
  const signedUpQuery = useMyActiveSignupEventIds();
  const [tab, setTab] = useState<Tab>("proximos");
  const now = useMemo(() => new Date(), []);

  const groups = useMemo(() => {
    const events = eventsQuery.data ?? [];
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const soonestFirst = (a: Event, b: Event) => a.datetime.getTime() - b.datetime.getTime();
    return {
      proximos: events.filter((event) => event.datetime >= now).sort(soonestFirst),
      mes: events
        .filter(
          (event) =>
            event.datetime.getFullYear() === now.getFullYear() && event.datetime.getMonth() === now.getMonth(),
        )
        .sort(soonestFirst),
      pasados: events
        .filter((event) => event.datetime < now && event.datetime >= sixMonthsAgo)
        .sort((a, b) => soonestFirst(b, a)),
    };
  }, [eventsQuery.data, now]);

  return (
    <Screen scroll={false}>
      <ScreenHeader eyebrow="Comunidad" title="Eventos" />
      <View accessibilityRole="radiogroup" accessibilityLabel="Filtrar eventos" className="flex-row gap-2 px-5 pt-4">
        {TABS.map((option) => (
          <Pill key={option.value} label={option.label} selected={tab === option.value} onPress={() => setTab(option.value)} />
        ))}
      </View>

      <DataLoader query={eventsQuery} emptyMessage="No hay eventos disponibles.">
        {(_events, isRefetching, refetch) => (
          <FlatList
            data={groups[tab]}
            keyExtractor={(item) => item.id}
            contentContainerClassName="gap-3 px-3 pb-8 pt-4"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            ListEmptyComponent={
              <AppText tone="faint" className="px-5 pt-8 text-center text-[14.5px]">
                {EMPTY[tab]}
              </AppText>
            }
            renderItem={({ item }) => {
              const isPast = item.datetime < now;
              return (
                <Card
                  onPress={() => router.push({ pathname: "/private/user/events/[id]", params: { id: item.id } })}
                  accessibilityLabel={item.title}
                  padded={false}
                  className={`overflow-hidden ${isPast ? "opacity-70" : ""}`}
                >
                  <View className="h-32 bg-ink">
                    {!!item.bannerUrl && (
                      <Image source={{ uri: item.bannerUrl }} className="absolute inset-0 h-full w-full" resizeMode="cover" />
                    )}
                    <View className="absolute left-3 top-3 h-14 w-[52px] items-center justify-center rounded-xl bg-surface">
                      <AppText variant="label" className="text-[9.5px]">
                        {monthShort(item.datetime)}
                      </AppText>
                      <AppText variant="heavy" className="text-[22px] leading-[25px]">
                        {item.datetime.getDate()}
                      </AppText>
                    </View>
                    <View className="absolute right-3 top-3 flex-row gap-1.5">
                      <Chip label={item.category} tone="inverse" />
                      {signedUpQuery.data?.has(item.id) && <Chip label="Inscrito" tone="ok" />}
                    </View>
                  </View>
                  <View className="gap-2 px-4 pb-4 pt-3.5">
                    <View className="flex-row items-baseline justify-between gap-2.5">
                      <AppText variant="bold" className="flex-1 text-[18px]">
                        {item.title}
                      </AppText>
                      <AppText variant="heavy" className="text-[16px]">
                        {formatEventPrice(item.price)}
                      </AppText>
                    </View>
                    <View className="flex-row flex-wrap gap-x-3.5 gap-y-1">
                      <EventMeta
                        icon="time-outline"
                        text={isPast ? "Evento finalizado" : `${weekdayShort(item.datetime)} ${to12hLabel(item.datetime)}`}
                      />
                      {!!item.location && <EventMeta icon="location-outline" text={item.location} />}
                      {!isPast && <EventSpots event={item} />}
                    </View>
                  </View>
                </Card>
              );
            }}
          />
        )}
      </DataLoader>
    </Screen>
  );
};

export default EventsList;
