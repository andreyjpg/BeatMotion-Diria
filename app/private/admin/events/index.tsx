import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip, { type ChipTone } from "@/components/ui/Chip";
import Fab from "@/components/ui/Fab";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { to12hLabel } from "@/constants/helpers";
import type { Event } from "@/hooks/events/schema";
import { useEvents } from "@/hooks/events/useEvents";
import { formatEventPrice } from "@/hooks/events/utils";
import { useEventSignupCounts, type EventSignupCounts } from "@/hooks/eventSignups/useEventSignupCounts";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";

type Tab = "scheduled" | "drafts" | "past";

const EMPTY: Record<Tab, string> = {
  scheduled: "No hay eventos programados.",
  drafts: "No hay borradores.",
  past: "No hay eventos pasados en los últimos 6 meses.",
};

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

const statusChip = (event: Event, now: Date): { label: string; tone: ChipTone } => {
  if (event.datetime < now) return { label: "Finalizado", tone: "line" };
  return event.status === "published" ? { label: "Publicado", tone: "ok" } : { label: "Borrador", tone: "hidden" };
};

/** "28/40 personas · 3 por aprobar": who's coming, and what's waiting for the admin. */
const signupsLine = (event: Event, counts?: EventSignupCounts) => {
  if (event.status === "draft") return "No visible para estudiantes";
  const people = counts?.people ?? 0;
  if (people === 0) return "Sin inscritos todavía";
  const coming = `${people}${event.capacity ? `/${event.capacity}` : ""} ${people === 1 ? "persona" : "personas"}`;
  return counts?.pending ? `${coming} · ${counts.pending} por aprobar` : coming;
};

/** Admin: every event, upcoming, in draft or recently past. */
const AdminEventsList = () => {
  const router = useRouter();
  const eventsQuery = useEvents({ includeDrafts: true, includePrivate: true });
  const [tab, setTab] = useState<Tab>("scheduled");
  const now = useMemo(() => new Date(), []);

  const groups = useMemo(() => {
    const events = eventsQuery.data ?? [];
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    return {
      scheduled: events
        .filter((event) => event.status === "published" && event.datetime >= now)
        .sort((a, b) => a.datetime.getTime() - b.datetime.getTime()),
      drafts: events
        .filter((event) => event.status === "draft")
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
      past: events
        .filter((event) => event.datetime < now && event.datetime >= sixMonthsAgo)
        .sort((a, b) => b.datetime.getTime() - a.datetime.getTime()),
    };
  }, [eventsQuery.data, now]);

  const listedIds = useMemo(
    () => [...new Set([...groups.scheduled, ...groups.drafts, ...groups.past].map((event) => event.id))],
    [groups],
  );
  const countsQuery = useEventSignupCounts(listedIds);

  const refresh = () => {
    eventsQuery.refetch();
    countsQuery.refetch();
  };

  const segments: { value: Tab; label: string; count?: number }[] = [
    { value: "scheduled", label: "Programados", count: eventsQuery.data ? groups.scheduled.length : undefined },
    { value: "drafts", label: "Borradores", count: eventsQuery.data ? groups.drafts.length : undefined },
    { value: "past", label: "Pasados", count: eventsQuery.data ? groups.past.length : undefined },
  ];

  return (
    <Screen scroll={false}>
      <ScreenHeader eyebrow="Administración" title="Eventos" />
      <SegmentedControl
        segments={segments}
        value={tab}
        onChange={setTab}
        accessibilityLabel="Estado de los eventos"
        className="mx-5 mt-4"
      />

      <DataLoader query={eventsQuery} emptyMessage="Todavía no hay eventos.">
        {(_events, isRefetching) => (
          <FlatList
            data={groups[tab]}
            keyExtractor={(item) => item.id}
            // Bottom space so the floating button doesn't cover the last card.
            contentContainerClassName="gap-2.5 px-3 pb-28 pt-3.5"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}
            ListEmptyComponent={
              <AppText tone="faint" className="px-5 pt-8 text-center text-[14.5px]">
                {EMPTY[tab]}
              </AppText>
            }
            renderItem={({ item }) => (
              <Card
                onPress={() => router.push({ pathname: "/private/admin/events/[id]", params: { id: item.id } })}
                accessibilityLabel={item.title}
                padded={false}
                className="flex-row gap-3 p-3"
              >
                <View className="h-[88px] w-[72px] items-center justify-center rounded-xl bg-ink">
                  <AppText variant="label" tone="hero-soft" className="text-[9.5px]">
                    {MONTHS[item.datetime.getMonth()]}
                  </AppText>
                  <AppText variant="heavy" tone="inverse" className="text-[24px] leading-[28px]">
                    {item.datetime.getDate()}
                  </AppText>
                </View>
                <View className="flex-1 gap-1.5 pt-0.5">
                  <View className="flex-row flex-wrap gap-1.5">
                    <Chip {...statusChip(item, now)} />
                    <Chip label={item.isPublic ? "Público" : "Miembros"} />
                  </View>
                  <AppText variant="bold" className="text-[16px]" numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                    {`${to12hLabel(item.datetime)} · ${formatEventPrice(item.price)}`}
                  </AppText>
                  {countsQuery.data && (
                    <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                      {signupsLine(item, countsQuery.data[item.id])}
                    </AppText>
                  )}
                </View>
              </Card>
            )}
          />
        )}
      </DataLoader>

      <Fab label="Nuevo evento" onPress={() => router.push("/private/admin/events/new")} />
    </Screen>
  );
};

export default AdminEventsList;
