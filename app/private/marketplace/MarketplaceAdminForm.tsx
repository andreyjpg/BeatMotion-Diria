import FieldError from "@/components/FieldError";
import FormScrollView from "@/components/FormScrollView";
import { pickImage } from "@/components/pickImage";
import {
  FormErrors,
  marketplaceFormSchema,
  validationErrors,
} from "@/constants/validationForms";
import type { MarketplaceImageInput, MarketplaceItemInput } from "@/hooks/marketplace/schema";
import { useCreateMarketplaceItem } from "@/hooks/marketplace/useCreateMarketplaceItem";
import { useDeleteMarketplaceItem } from "@/hooks/marketplace/useDeleteMarketplaceItem";
import { useMarketplaceItems } from "@/hooks/marketplace/useMarketplaceItems";
import { useUpdateMarketplaceItem } from "@/hooks/marketplace/useUpdateMarketplaceItem";
import type { PickedImage } from "@/hooks/storage/compressImage";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** A photo in the form: `uri` is what's shown, `image` what gets saved. */
type MarketplaceImageState = {
  id: string;
  uri: string;
  image: MarketplaceImageInput;
};

const generateImageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const pickedImageState = (picked: PickedImage): MarketplaceImageState => ({
  id: generateImageId(),
  uri: picked.uri,
  image: { picked },
});

const storedImageState = (path: string, url: string): MarketplaceImageState => ({
  id: generateImageId(),
  uri: url,
  image: { path },
});

const PERMISSION_MESSAGE =
  "Necesitamos acceso a tu galeria para que puedas seleccionar imagenes del marketplace.";

/** Empty optional text is saved as NULL. */
const optionalText = (value: string) => value.trim() || null;

export default function MarketplaceAdminForm() {
  const { user } = useActiveUser();
  const { itemId: rawItemId } = useLocalSearchParams<{ itemId?: string }>();
  const itemId = useMemo(
    () => (Array.isArray(rawItemId) ? rawItemId[0] : rawItemId),
    [rawItemId]
  );
  const isEditing = Boolean(itemId);
  const { data: marketplaceItems, isLoading: isLoadingItems } =
    useMarketplaceItems();
  const existingItem = useMemo(
    () =>
      itemId
        ? marketplaceItems?.find((entry) => entry.id === itemId) ?? null
        : null,
    [itemId, marketplaceItems]
  );
  const hasHydratedFromItem = useRef(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [primaryImage, setPrimaryImage] =
    useState<MarketplaceImageState | null>(null);
  const [galleryImages, setGalleryImages] = useState<MarketplaceImageState[]>(
    []
  );
  const [category, setCategory] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<FormErrors<typeof marketplaceFormSchema>>({});

  const createMarketplaceItemMutation = useCreateMarketplaceItem();
  const updateMarketplaceItemMutation = useUpdateMarketplaceItem();
  const deleteMarketplaceItemMutation = useDeleteMarketplaceItem();

  // Photos upload inside the save mutations.
  const isSaving =
    createMarketplaceItemMutation.isPending ||
    updateMarketplaceItemMutation.isPending;
  const isDeleting = deleteMarketplaceItemMutation.isPending;

  const handleSelectPrimaryImage = async () => {
    if (isSaving) return;
    const picked = await pickImage(PERMISSION_MESSAGE);
    if (picked) setPrimaryImage(pickedImageState(picked));
  };

  const handleRemovePrimaryImage = () => {
    if (isSaving) return;
    setPrimaryImage(null);
  };

  const handleAddGalleryImage = async () => {
    if (isSaving) return;
    const picked = await pickImage(PERMISSION_MESSAGE);
    if (picked) setGalleryImages((prev) => [...prev, pickedImageState(picked)]);
  };

  const handleRemoveGalleryImage = (id: string) => {
    if (isSaving) return;
    setGalleryImages((prev) => prev.filter((image) => image.id !== id));
  };

  useEffect(() => {
    hasHydratedFromItem.current = false;
  }, [itemId]);

  useEffect(() => {
    if (hasHydratedFromItem.current) return;
    if (!existingItem) {
      setPrimaryImage(null);
      setGalleryImages([]);
      return;
    }

    setName(existingItem.name);
    setPrice(String(existingItem.price));
    setShortDescription(existingItem.shortDescription ?? "");
    setDescription(existingItem.description ?? "");
    // imagePaths[i] and images[i] are the same photo (path / public URL).
    const stored = existingItem.imagePaths.map((path, index) =>
      storedImageState(path, existingItem.images[index])
    );
    setPrimaryImage(stored[0] ?? null);
    setGalleryImages(stored.slice(1));
    setCategory(existingItem.category ?? "");
    setItemCode(existingItem.itemId ?? "");
    setActive(existingItem.active);

    hasHydratedFromItem.current = true;
  }, [existingItem]);

  const resetForm = () => {
    setName("");
    setPrice("");
    setShortDescription("");
    setDescription("");
    setPrimaryImage(null);
    setGalleryImages([]);
    setCategory("");
    setItemCode("");
    setActive(true);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (isSaving) return;

    if (isEditing && !existingItem) {
      if (isLoadingItems) {
        Alert.alert(
          "Marketplace",
          "Aun estamos cargando el articulo seleccionado. Intenta nuevamente en unos segundos."
        );
      } else {
        Alert.alert(
          "Marketplace",
          "No encontramos este articulo. Es posible que haya sido eliminado.",
          [
            {
              text: "Aceptar",
              onPress: () => router.back(),
            },
          ]
        );
      }
      return;
    }

    // "12,000" or "₡12000" are accepted as 12000.
    const priceValue = price.replace(/[\s,₡]/g, "");
    const formErrors = validationErrors(marketplaceFormSchema, {
      name,
      price: priceValue,
      hasPrimaryImage: !!primaryImage,
    });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0 || !primaryImage) return;

    const payload: MarketplaceItemInput = {
      name: name.trim(),
      price: Number(priceValue),
      description: optionalText(description),
      shortDescription: optionalText(shortDescription),
      category: optionalText(category),
      itemId: optionalText(itemCode),
      active,
      images: [primaryImage, ...galleryImages].map((entry) => entry.image),
    };

    try {
      if (isEditing && itemId) {
        await updateMarketplaceItemMutation.mutateAsync({
          itemId,
          data: payload,
        });
        Alert.alert("Marketplace", "Articulo actualizado correctamente.", [
          {
            text: "Aceptar",
            onPress: () => router.back(),
          },
        ]);
      } else {
        await createMarketplaceItemMutation.mutateAsync(payload);
        Alert.alert("Marketplace", "Articulo agregado correctamente.", [
          {
            text: "Aceptar",
            onPress: () => router.back(),
          },
        ]);
        resetForm();
      }
    } catch (error) {
      console.error("No se pudo guardar el articulo:", error);
      Alert.alert(
        "Error",
        "No pudimos guardar el articulo. Intenta nuevamente en unos minutos."
      );
    }
  };

  const handleDelete = () => {
    if (!isEditing || !itemId || isDeleting) return;

    Alert.alert(
      "Eliminar articulo",
      "Esta accion no se puede deshacer. Deseas eliminar este articulo del marketplace?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMarketplaceItemMutation.mutateAsync(itemId);
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
  };

  if (user?.role !== "admin") {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-10">
        <Text className="text-white text-lg font-semibold mb-4">
          Permiso denegado
        </Text>
        <Text className="text-gray-400 text-center mb-6">
          Solo los administradores pueden acceder a este formulario de la
          tienda.
        </Text>
        <TouchableOpacity
          className="bg-yellow-400 px-6 py-3 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="font-semibold">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isEditing && isLoadingItems && !existingItem) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#facc15" />
        <Text className="text-white mt-4">Cargando articulo...</Text>
      </SafeAreaView>
    );
  }

  if (isEditing && !isLoadingItems && !existingItem) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-10">
        <Text className="text-white text-lg font-semibold mb-4">
          No encontramos este articulo.
        </Text>
        <Text className="text-gray-400 text-center mb-6">
          Puede que haya sido eliminado recientemente. Vuelve a la lista del
          marketplace.
        </Text>
        <TouchableOpacity
          className="bg-yellow-400 px-6 py-3 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="font-semibold">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
        <FormScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          className="flex-1 px-6"
        >
          <View className="flex-row items-center justify-between pt-8 pb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-gray-900 items-center justify-center"
              accessibilityLabel="Volver"
            >
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-semibold">
              {isEditing ? "Editar articulo" : "Nuevo articulo"}
            </Text>
            {isEditing ? (
              <TouchableOpacity
                onPress={handleDelete}
                className="w-10 h-10 rounded-full bg-red-600 items-center justify-center"
                accessibilityLabel="Eliminar articulo"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="trash" size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            ) : (
              <View className="w-10 h-10" />
            )}
          </View>

          <View className="gap-4">
            <View>
              <Text className="text-white font-semibold mb-2">Nombre</Text>
              <TextInput
                className="bg-gray-900 text-white rounded-2xl px-4 py-3"
                placeholder="Nombre del articulo"
                placeholderTextColor="#6b7280"
                value={name}
                onChangeText={setName}
              />
              <FieldError message={errors.name} />
            </View>

            <View>
              <Text className="text-white font-semibold mb-2">
                Codigo interno (opcional)
              </Text>
              <TextInput
                className="bg-gray-900 text-white rounded-2xl px-4 py-3"
                placeholder="SKU o referencia"
                placeholderTextColor="#6b7280"
                value={itemCode}
                onChangeText={setItemCode}
                autoCapitalize="characters"
              />
            </View>

            <View>
              <Text className="text-white font-semibold mb-2">Precio</Text>
              <TextInput
                className="bg-gray-900 text-white rounded-2xl px-4 py-3"
                placeholder="00000"
                placeholderTextColor="#6b7280"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
              <FieldError message={errors.price} />
            </View>

            <View>
              <Text className="text-white font-semibold mb-2">Moneda</Text>
              <View className="bg-gray-900 rounded-2xl px-4 py-3">
                <Text className="text-white font-semibold">CRC</Text>
                <Text className="text-gray-500 text-xs mt-1">
                  El marketplace opera únicamente en colones costarricenses.
                </Text>
              </View>
            </View>

            <View>
              <Text className="text-white font-semibold mb-2">
                Descripcion corta (opcional)
              </Text>
              <TextInput
                className="bg-gray-900 text-white rounded-2xl px-4 py-3"
                placeholder="Resumen del articulo"
                placeholderTextColor="#6b7280"
                value={shortDescription}
                onChangeText={setShortDescription}
              />
            </View>

            <View>
              <Text className="text-white font-semibold mb-2">
                Descripcion completa
              </Text>
              <TextInput
                className="bg-gray-900 text-white rounded-2xl px-4 py-3 min-h-32"
                placeholder="Detalles adicionales, cuidados, tallas, etc."
                placeholderTextColor="#6b7280"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View>
              <Text className="text-white font-semibold mb-2">
                Categoria (opcional)
              </Text>
              <TextInput
                className="bg-gray-900 text-white rounded-2xl px-4 py-3"
                placeholder="Ropa, Accesorios, etc."
                placeholderTextColor="#6b7280"
                value={category}
                onChangeText={setCategory}
              />
            </View>

            <View>
              <Text className="text-white font-semibold mb-2">
                Imagen principal
              </Text>
              {primaryImage ? (
                <View className="bg-gray-900 rounded-2xl p-4 gap-4">
                  <View className="rounded-xl overflow-hidden h-40 bg-gray-950">
                    <Image
                      source={{ uri: primaryImage.uri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 bg-yellow-400 rounded-full px-4 py-3 items-center"
                      onPress={handleSelectPrimaryImage}
                      disabled={isSaving}
                    >
                      <Text className="font-semibold text-black">
                        Reemplazar imagen
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-12 h-12 rounded-full bg-red-600 items-center justify-center"
                      onPress={handleRemovePrimaryImage}
                      disabled={isSaving}
                      accessibilityLabel="Quitar imagen principal"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#ffffff"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  className="bg-gray-900 rounded-2xl px-4 py-5 items-center justify-center"
                  onPress={handleSelectPrimaryImage}
                  disabled={isSaving}
                >
                  <Ionicons name="image-outline" size={28} color="#9ca3af" />
                  <Text className="text-gray-400 mt-2 text-sm text-center">
                    Selecciona una imagen desde tu galeria
                  </Text>
                </TouchableOpacity>
              )}
              <FieldError message={errors.hasPrimaryImage} />
            </View>

            <View>
              <Text className="text-white font-semibold mb-2">Galeria</Text>
              {galleryImages.length > 0 ? (
                <View className="flex-row flex-wrap gap-4">
                  {galleryImages.map((image) => {
                    return (
                      <View key={image.id} className="relative">
                        <Image
                          source={{ uri: image.uri }}
                          className="w-28 h-28 rounded-xl"
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          onPress={() => handleRemoveGalleryImage(image.id)}
                          className="absolute -top-2 -right-2 bg-black/80 rounded-full w-7 h-7 items-center justify-center"
                          disabled={isSaving}
                          accessibilityLabel="Eliminar imagen de la galeria"
                        >
                          <Ionicons name="close" size={16} color="#f87171" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text className="text-gray-400">
                  Aun no has agregado imagenes adicionales.
                </Text>
              )}
              <TouchableOpacity
                className="mt-3 bg-gray-900 rounded-full px-4 py-3 items-center"
                onPress={handleAddGalleryImage}
                disabled={isSaving}
              >
                <Text className="text-white font-semibold">
                  Agregar imagen a la galeria
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between bg-gray-900 rounded-2xl px-4 py-3">
              <Text className="text-white font-semibold">Articulo activo</Text>
              <Switch
                value={active}
                onValueChange={setActive}
                thumbColor={active ? "#facc15" : "#6b7280"}
                trackColor={{ false: "#374151", true: "#fde68a" }}
              />
            </View>
          </View>

          <TouchableOpacity
            className="bg-yellow-400 rounded-full px-6 py-4 mt-8 items-center"
            onPress={handleSubmit}
            disabled={isSaving}
          >
            <Text className="font-semibold text-black">
              {isSaving
                ? "Guardando..."
                : isEditing
                ? "Actualizar articulo"
                : "Guardar articulo"}
            </Text>
          </TouchableOpacity>
        </FormScrollView>
    </SafeAreaView>
  );
}
