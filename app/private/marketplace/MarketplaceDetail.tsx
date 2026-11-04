import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import IconButton from "@/components/ui/IconButton";
import InfoRow from "@/components/ui/InfoRow";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatCurrency } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useMarketplaceItems } from "@/hooks/marketplace/useMarketplaceItems";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";

/** One item of the store: photos, price and how to buy it. Admins can edit it. */
const MarketplaceDetail = () => {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const itemsQuery = useMarketplaceItems();
  const { user } = useActiveUser();
  const [photo, setPhoto] = useState(0);

  const item = itemsQuery.data?.find((entry) => entry.id === itemId);

  if (!item) {
    return (
      <Screen scroll={false}>
        <ScreenHeader eyebrow="Tienda" title="Artículo" />
        <View className="flex-1">
          <DataLoader query={itemsQuery} emptyMessage="No encontramos este artículo.">
            {() => (
              <AppText tone="muted" className="px-5 pt-3 text-[14.5px] leading-[20px]">
                No encontramos este artículo. Es posible que haya sido eliminado o aún no esté disponible.
              </AppText>
            )}
          </DataLoader>
        </View>
      </Screen>
    );
  }

  const photoUrl = item.gallery[photo] ?? item.imageUrl;
  const description = item.description ?? item.shortDescription;

  return (
    <Screen>
      <View className="h-[340px] items-center justify-center bg-control">
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={48} color={palette.faint} />
        )}
        <View className="absolute left-4 top-3">
          <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Volver a la tienda" />
        </View>
        {user?.role === "admin" && (
          <View className="absolute right-4 top-3">
            <IconButton
              icon="create-outline"
              onPress={() => router.push(`/private/marketplace/MarketplaceAdminForm?itemId=${item.id}` as Href)}
              accessibilityLabel="Editar artículo"
            />
          </View>
        )}
        {item.gallery.length > 1 && (
          <View className="absolute bottom-3.5 right-4 rounded-md bg-surface px-2 py-1">
            <AppText variant="label" tone="muted" className="text-[10px]">
              {`Foto ${photo + 1} de ${item.gallery.length}`}
            </AppText>
          </View>
        )}
      </View>

      {item.gallery.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="Galería"
          contentContainerClassName="gap-2 px-5 pt-3"
        >
          {item.gallery.map((url, index) => (
            <Pressable
              key={url}
              onPress={() => setPhoto(index)}
              accessibilityRole="button"
              accessibilityLabel={`Ver foto ${index + 1}`}
              className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${index === photo ? "border-ink" : "border-ground"}`}
            >
              <Image source={{ uri: url }} className="h-full w-full" resizeMode="cover" />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View className="px-5 pt-[18px]">
        <View className="flex-row flex-wrap items-center gap-2">
          {item.category && (
            <AppText variant="label" tone="muted">
              {item.category}
            </AppText>
          )}
          {!item.active && <Chip label="Oculto" tone="hidden" />}
        </View>
        <AppText variant="display" className="mt-2 text-[34px] leading-[38px]">
          {item.name}
        </AppText>
        <AppText variant="heavy" className="mt-2.5 text-[28px] leading-[32px]">
          {formatCurrency(item.price, item.currency)}
        </AppText>
      </View>

      {!!description && <AppText className="mx-5 mt-3 text-[14.5px] leading-[21px]">{description}</AppText>}

      {item.itemId && (
        <Card className="mx-3 mt-4 py-1">
          <InfoRow label="Referencia" divider={false}>
            {item.itemId}
          </InfoRow>
        </Card>
      )}

      <Card className="mx-3 mt-2.5 gap-1.5">
        <AppText variant="bold" className="text-[15px]">
          ¿Cómo comprar?
        </AppText>
        <AppText tone="muted" className="text-[13.5px] leading-[19px]">
          Contáctanos a través de nuestro Instagram o WhatsApp para consultar por disponibilidad y realizar tu pedido.
        </AppText>
      </Card>
    </Screen>
  );
};

export default MarketplaceDetail;
