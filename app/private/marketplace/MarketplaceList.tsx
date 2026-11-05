import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Fab from "@/components/ui/Fab";
import Pill from "@/components/ui/Pill";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatCurrency, plural } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useMarketplaceItems } from "@/hooks/marketplace/useMarketplaceItems";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Image, RefreshControl, ScrollView, View } from "react-native";

/** The academy's store. Admins also see hidden items and can add new ones. */
const MarketplaceList = () => {
  const itemsQuery = useMarketplaceItems();
  const { user } = useActiveUser();
  const isAdmin = user?.role === "admin";
  const [category, setCategory] = useState<string | null>(null);

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter((name): name is string => !!name))],
    [items],
  );
  const shown = category ? items.filter((item) => item.category === category) : items;

  return (
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow={itemsQuery.data ? plural(items.length, "artículo", "artículos") : undefined}
        title="Tienda Diriá"
        subtitle="Ropa y accesorios de la academia."
      />

      {categories.length > 0 && (
        <View className="pt-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityRole="radiogroup"
            accessibilityLabel="Filtrar por categoría"
            contentContainerClassName="gap-2 px-5"
          >
            <Pill label="Todo" selected={category === null} onPress={() => setCategory(null)} />
            {categories.map((name) => (
              <Pill key={name} label={name} selected={category === name} onPress={() => setCategory(name)} />
            ))}
          </ScrollView>
        </View>
      )}

      <DataLoader
        query={itemsQuery}
        emptyMessage="No hay artículos disponibles. Vuelve pronto para descubrir nueva mercancía de la academia."
      >
        {(_items, isRefetching, refetch) => (
          <FlatList
            data={shown}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperClassName="justify-between"
            // Bottom space so the floating button doesn't cover the last row.
            contentContainerClassName={`gap-2.5 px-3 pt-4 ${isAdmin ? "pb-28" : "pb-8"}`}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            renderItem={({ item }) => (
              <View className="w-[48.5%]">
                <Card
                  onPress={() => router.push(`/private/marketplace/MarketplaceDetail?itemId=${item.id}` as Href)}
                  accessibilityLabel={`Ver detalle de ${item.name}`}
                  padded={false}
                  className="flex-1 overflow-hidden"
                >
                  <View className="h-[150px] items-center justify-center bg-control">
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <Ionicons name="image-outline" size={32} color={palette.faint} />
                    )}
                    {!item.active && (
                      <View className="absolute left-2 top-2">
                        <Chip label="Oculto" tone="hidden" />
                      </View>
                    )}
                  </View>
                  <View className="gap-0.5 px-3 pb-3 pt-2.5">
                    {item.category && (
                      <AppText variant="label" tone="muted" className="text-[9.5px]">
                        {item.category}
                      </AppText>
                    )}
                    <AppText variant="bold" className="text-[15px] leading-[19px]">
                      {item.name}
                    </AppText>
                    <AppText variant="heavy" className="mt-1 text-[16px]">
                      {formatCurrency(item.price, item.currency)}
                    </AppText>
                  </View>
                </Card>
              </View>
            )}
          />
        )}
      </DataLoader>

      {isAdmin && (
        <Fab label="Nuevo artículo" onPress={() => router.push("/private/marketplace/MarketplaceAdminForm")} />
      )}
    </Screen>
  );
};

export default MarketplaceList;
