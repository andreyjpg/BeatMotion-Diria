import HeaderTitle from "@/components/headerTitle";
import { formatCurrency } from "@/constants/helpers";
import type { MarketplaceItem } from "@/hooks/marketplace/schema";
import { useMarketplaceItems } from "@/hooks/marketplace/useMarketplaceItems";
import { useDeleteMarketplaceItem } from "@/hooks/marketplace/useDeleteMarketplaceItem";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MarketplaceList() {
  const { data, isLoading, isRefetching, refetch } = useMarketplaceItems();
  const { user } = useActiveUser();
  const deleteMarketplaceItemMutation = useDeleteMarketplaceItem();
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(
    null
  );
  const isAdmin = user?.role === "admin";

  const items = useMemo(() => data ?? [], [data]);

  const handleOpenItem = useCallback((item: MarketplaceItem) => {
    router.push(
      `/private/marketplace/MarketplaceDetail?itemId=${item.id}` as Href
    );
  }, []);

  const handleEditItem = useCallback((item: MarketplaceItem) => {
    router.push(
      `/private/marketplace/MarketplaceAdminForm?itemId=${item.id}` as Href
    );
  }, []);

  const handleDeleteItem = useCallback((item: MarketplaceItem) => {
    Alert.alert(
      "Eliminar articulo",
      `Deseas eliminar "${item.name}" del marketplace?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setPendingDeletionId(item.id);
              await deleteMarketplaceItemMutation.mutateAsync(item.id);
              Alert.alert("Marketplace", "Articulo eliminado correctamente.");
            } catch (error) {
              console.error("No se pudo eliminar el articulo:", error);
              Alert.alert(
                "Error",
                "No pudimos eliminar el articulo. Intenta nuevamente en unos minutos."
              );
            } finally {
              setPendingDeletionId(null);
            }
          },
        },
      ]
    );
  }, []);

  const handleOpenAdminForm = useCallback(() => {
    router.push("/private/marketplace/MarketplaceAdminForm" as Href);
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#facc15" />
        <Text className="text-white mt-4">Cargando articulos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle
        title="Tienda Diriá"
        subtitle="Explora los artículos disponibles para la academia."
      />

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-white text-center text-lg font-semibold mb-2">
            No hay artículos disponibles.
          </Text>
          <Text className="text-gray-400 text-center">
            Vuelve pronto para descubrir nueva mercancía de la academia.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          columnWrapperStyle={{ gap: 16, marginBottom: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#facc15"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-gray-900 rounded-3xl overflow-hidden flex-1"
              onPress={() => handleOpenItem(item)}
              accessibilityLabel={`Ver detalle de ${item.name}`}
            >
              {isAdmin && (
                <View className="absolute top-3 right-3 flex-row gap-2 z-10">
                  <TouchableOpacity
                    className="w-9 h-9 rounded-full bg-black/70 items-center justify-center"
                    onPress={() => handleEditItem(item)}
                    accessibilityLabel={`Editar ${item.name}`}
                  >
                    <Ionicons name="create-outline" size={18} color="#facc15" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`w-9 h-9 rounded-full bg-black/70 items-center justify-center ${
                      pendingDeletionId === item.id ? "opacity-50" : ""
                    }`}
                    onPress={() => handleDeleteItem(item)}
                    accessibilityLabel={`Eliminar ${item.name}`}
                    disabled={pendingDeletionId === item.id}
                  >
                    {pendingDeletionId === item.id ? (
                      <ActivityIndicator size="small" color="#f87171" />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#f87171"
                      />
                    )}
                  </TouchableOpacity>
                </View>
              )}
              <View className="h-36 w-full bg-gray-950">
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="image-outline" size={36} color="#4b5563" />
                    <Text className="text-gray-500 mt-2 text-xs">
                      Sin imagen
                    </Text>
                  </View>
                )}
              </View>

              <View className="p-4 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white text-base font-semibold flex-1 pr-2">
                    {item.name}
                  </Text>
                  {item.active === false && (
                    <View className="bg-red-600 px-2 py-0.5 rounded-full">
                      <Text className="text-white text-[10px] font-semibold">
                        Inactivo
                      </Text>
                    </View>
                  )}
                </View>
                {item.category && (
                  <Text className="text-yellow-400 text-[11px] uppercase tracking-wide">
                    {item.category}
                  </Text>
                )}
                <Text
                  className="text-gray-400 text-xs"
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.shortDescription ??
                    item.description ??
                    "Sin descripcion disponible"}
                </Text>
                <View className="mt-1">
                  <Text className="text-yellow-400 text-sm font-bold">
                    {formatCurrency(item.price, item.currency)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {isAdmin && (
        <View className="absolute bottom-10 right-8">
          <TouchableOpacity
            className="bg-yellow-400 w-14 h-14 rounded-full items-center justify-center shadow-lg"
            onPress={handleOpenAdminForm}
            accessibilityLabel="Agregar nuevo articulo"
          >
            <Ionicons name="add" size={28} color="#000000" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
