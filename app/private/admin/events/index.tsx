import DataLoader from "@/components/DataLoader";
import FilterPills from "@/components/FilterPills";
import HeaderTitle from "@/components/headerTitle";
import type { Event } from "@/hooks/events/schema";
import { useEvents } from "@/hooks/events/useEvents";
import {
  formatEventAudience,
  formatEventCapacity,
  formatEventDateTime,
  formatEventPrice,
} from "@/hooks/events/utils";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";

type Tab = "programados" | "drafts" | "pasados";

const TABS = [
  { label: "Programados", value: "programados" },
  { label: "Borradores", value: "drafts" },
  { label: "Pasados", value: "pasados" },
];

const AdminEventsList = () => {
  const eventsQuery = useEvents({ includeDrafts: true, includePrivate: true });
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("programados");
  const now = useMemo(() => new Date(), []);
  const sixMonthsAgo = useMemo(() => {
    const d = new Date(now);
    d.setMonth(now.getMonth() - 6);
    return d;
  }, [now]);

  const filterByTab = (events: Event[]) => {
    if (tab === "programados") {
      return events
        .filter((evt) => evt.status === "published" && evt.datetime >= now)
        .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
    }
    if (tab === "drafts") {
      return events
        .filter((evt) => evt.status === "draft")
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    // pasados últimos 6 meses
    return events
      .filter((evt) => evt.datetime < now && evt.datetime >= sixMonthsAgo)
      .sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
  };

  const renderCard = (item: Event) => (
    <TouchableOpacity
      className="bg-gray-900 rounded-2xl overflow-hidden active:opacity-80"
      onPress={() => router.push(`/private/admin/events/${item.id}` as const)}
    >
      {/* Banner */}
      {item.bannerUrl ? (
        <Image
          source={{ uri: item.bannerUrl }}
          className="w-full h-48"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-48 bg-gray-800 items-center justify-center">
          <Icon name="image-outline" size={28} color="#6b7280" />
          <Text className="text-gray-400 mt-2">Sin imagen</Text>
        </View>
      )}

      <View className="p-4 gap-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-lg font-semibold flex-1">
            {item.title}
          </Text>
          <View className="flex-row items-center gap-1 flex-wrap">
            {item.datetime < new Date() && (
              <View className="px-2 py-1 rounded-full bg-red-700">
                <Text className="text-white text-xs">Evento finalizado</Text>
              </View>
            )}
            <View
              className={`px-2 py-1 rounded-full ${
                item.status === "published" ? "bg-green-700" : "bg-gray-700"
              }`}
            >
              <Text className="text-white text-xs">
                {item.status === "published" ? "Publicado" : "Borrador"}
              </Text>
            </View>
            <View
              className={`px-2 py-1 rounded-full ${
                item.isPublic ? "bg-blue-700" : "bg-purple-700"
              }`}
            >
              <Text className="text-white text-xs">
                {item.isPublic ? "Público" : "Miembros"}
              </Text>
            </View>
          </View>
        </View>

        <Text className="text-gray-300">
          {formatEventDateTime(item.datetime)}
        </Text>
        <Text className="text-gray-300">
          {item.location || "Sin ubicación"}
        </Text>
        <Text className="text-gray-300">
          {formatEventPrice(item.price)} • {formatEventCapacity(item.capacity)}
        </Text>
        <Text className="text-gray-400 text-sm">
          {formatEventAudience(item.isPublic)}
        </Text>
        {item.description ? (
          <Text className="text-gray-400 text-sm" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const EmptyState = ({ refetch }: { refetch: () => void }) => (
    <View className="items-center justify-center py-12 px-8 gap-4">
      <Text className="text-white text-center">
        {tab === "programados"
          ? "No hay eventos programados, ¿deseas registrar uno?"
          : tab === "drafts"
          ? "No hay borradores"
          : "No hay eventos pasados este año"}
      </Text>
      <View className="flex-row gap-2">
        {tab === "programados" && (
          <TouchableOpacity
            className="bg-yellow-400 rounded-full px-4 py-3 flex-row items-center gap-2 active:opacity-80"
            onPress={() => router.push("/private/admin/events/new")}
          >
            <Icon name="add-circle-outline" size={20} color="#000" />
            <Text className="text-black font-semibold">Registrar evento</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="bg-gray-800 rounded-full px-4 py-3 flex-row items-center gap-2 active:opacity-80"
          onPress={refetch}
        >
          <Icon name="refresh" size={18} color="#fff" />
          <Text className="text-white font-semibold">Refrescar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row justify-between items-center">
        <HeaderTitle title="Eventos" />
        <TouchableOpacity
          className="bg-primary h-10 rounded-full px-4 py-2 flex-row items-center gap-2 active:opacity-80"
          onPress={() => router.push("/private/admin/events/new")}
        >
          <Icon name="add-circle-outline" size={20} color="#000" />
          <Text className="text-black font-semibold">Nuevo evento</Text>
        </TouchableOpacity>
      </View>

      <View className="items-center ">
        <FilterPills
          options={TABS}
          onSelect={(value: string) => setTab(value as Tab)}
          selected={tab}
        />
      </View>

      <DataLoader query={eventsQuery} emptyMessage="No hay eventos">
        {(events, isRefetching, refetch) => {
          const filtered = filterByTab(events as Event[]);
          if (!filtered.length) {
            return <EmptyState refetch={refetch} />;
          }

          return (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 48,
                gap: 12,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  tintColor="#facc15"
                />
              }
              renderItem={({ item }) => renderCard(item)}
            />
          );
        }}
      </DataLoader>
    </SafeAreaView>
  );
};

export default AdminEventsList;
