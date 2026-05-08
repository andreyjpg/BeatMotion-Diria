import { formatCurrency } from "@/constants/helpers";
import { useMarketplaceItems } from "@/hooks/marketplace/useMarketplaceItems";
import { useDeleteMarketplaceItem } from "@/hooks/marketplace/useDeleteMarketplaceItem";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MarketplaceDetail() {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const { data, isLoading } = useMarketplaceItems();
  const { user } = useActiveUser();
  const deleteMarketplaceItemMutation = useDeleteMarketplaceItem();
  const isDeleting = deleteMarketplaceItemMutation.isPending;

  const item = useMemo(
    () => data?.find((entry) => entry.id === itemId) ?? null,
    [data, itemId]
  );
  const isAdmin = user?.role === "admin";

  const handleEdit = useCallback(() => {
    if (!item) return;
    router.push(
      `/private/marketplace/MarketplaceAdminForm?itemId=${item.id}` as Href
    );
  }, [item]);

  const handleDelete = useCallback(() => {
    if (!item || isDeleting) return;

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
              await deleteMarketplaceItemMutation.mutateAsync(item.id);
              Alert.alert("Marketplace", "Articulo eliminado correctamente.", [
                {
                  text: "Aceptar",
                  onPress: () => router.back(),
                },
              ]);
            } catch (error) {
              console.error("No se pudo eliminar el articulo:", error);
              Alert.alert(
                "Error",
                "No pudimos eliminar el articulo. Intenta nuevamente en unos minutos."
              );
            }
          },
        },
      ]
    );
  }, [item, isDeleting, deleteMarketplaceItemMutation]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#facc15" />
        <Text className="text-white mt-4">Cargando artículo...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-10">
        <Text className="text-white text-lg font-semibold mb-4">
          No encontramos este artículo.
        </Text>
        <Text className="text-gray-400 text-center mb-6">
          Es posible que haya sido eliminado o aun no este disponible.
        </Text>
        <TouchableOpacity
          className="bg-yellow-400 px-6 py-3 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="font-semibold">Volver a la tienda</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const gallery =
    (item.gallery && item.gallery.length ? item.gallery : undefined) ??
    (item.imageUrl ? [item.imageUrl] : []);
  const secondaryImages = gallery.filter((url) => url !== item.imageUrl);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 48,
        }}
      >
        <View className="flex-row items-center justify-between px-6 pt-8 pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-900 items-center justify-center"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">
            Detalle del artículo
          </Text>
          <View className="w-10 h-10" />
        </View>

        <View className="px-6">
          {isAdmin && (
            <View className="flex-row justify-end gap-3 mb-4">
              <TouchableOpacity
                onPress={handleEdit}
                className="flex-row items-center gap-1 rounded-full px-3 py-2 bg-gray-900"
                accessibilityLabel="Editar articulo"
              >
                <Ionicons name="create-outline" size={16} color="#facc15" />
                <Text className="text-yellow-400 text-xs font-semibold uppercase">
                  Editar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                className={`flex-row items-center gap-1 rounded-full px-3 py-2 bg-red-600 ${
                  isDeleting ? "opacity-60" : ""
                }`}
                accessibilityLabel="Eliminar articulo"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="trash-outline" size={16} color="#ffffff" />
                )}
                <Text className="text-white text-xs font-semibold uppercase">
                  Eliminar
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View className="rounded-3xl overflow-hidden bg-gray-900 h-64 mb-6">
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="image-outline" size={48} color="#4b5563" />
                <Text className="text-gray-500 mt-2">Sin imagen principal</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white text-2xl font-bold flex-1 pr-2">
              {item.name}
            </Text>
            {item.active === false && (
              <View className="bg-red-600 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-semibold">
                  Inactivo
                </Text>
              </View>
            )}
          </View>

          {item.category && (
            <Text className="text-yellow-400 text-sm font-semibold uppercase mb-1">
              {item.category}
            </Text>
          )}

          <Text className="text-yellow-400 text-xl font-semibold mb-2">
            {formatCurrency(item.price, item.currency)}
          </Text>
          {item.itemId && (
            <Text className="text-gray-500 text-xs uppercase mb-6">
              Código interno: {item.itemId}
            </Text>
          )}

          <Text className="text-gray-300 text-base leading-6 mb-6">
            {item.description ??
              item.shortDescription ??
              "No hay descripcion disponible por el momento."}
          </Text>

          {secondaryImages.length > 0 && (
            <View className="mb-8">
              <Text className="text-white text-lg font-semibold mb-3">
                Galeria
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 16 }}
              >
                {secondaryImages.map((url) => (
                  <View
                    key={url}
                    className="h-40 w-40 rounded-2xl overflow-hidden bg-gray-900"
                  >
                    <Image
                      source={{ uri: url }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View className="bg-gray-900 rounded-3xl px-5 py-6">
            <Text className="text-white text-base font-semibold mb-2">
              ¿Cómo comprar?
            </Text>
            <Text className="text-gray-400 text-sm leading-5">
              Contáctanos a través de nuestro instagram o whatsapp para
              consultar por disponibilidad y realizar tu pedido.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
