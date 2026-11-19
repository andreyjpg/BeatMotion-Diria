import DataLoader from "@/components/DataLoader";
import FieldError from "@/components/FieldError";
import { pickImage } from "@/components/pickImage";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SwitchRow from "@/components/ui/SwitchRow";
import palette from "@/constants/palette.json";
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
import { Alert, Image, Pressable, View } from "react-native";

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
  "Necesitamos acceso a tu galería para que puedas seleccionar imágenes de la tienda.";

/** Empty optional text is saved as NULL. */
const optionalText = (value: string) => value.trim() || null;

const SectionTitle = ({ title }: { title: string }) => (
  <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
    {title}
  </AppText>
);

const MarketplaceAdminForm = () => {
  const { user } = useActiveUser();
  const { itemId: rawItemId } = useLocalSearchParams<{ itemId?: string }>();
  const itemId = useMemo(
    () => (Array.isArray(rawItemId) ? rawItemId[0] : rawItemId),
    [rawItemId]
  );
  const isEditing = Boolean(itemId);
  const itemsQuery = useMarketplaceItems();
  const existingItem = useMemo(
    () =>
      itemId
        ? itemsQuery.data?.find((entry) => entry.id === itemId) ?? null
        : null,
    [itemId, itemsQuery.data]
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

  const handleSubmit = async () => {
    if (isSaving) return;

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
        Alert.alert("Tienda", "Artículo actualizado correctamente.", [
          { text: "Aceptar", onPress: () => router.back() },
        ]);
      } else {
        await createMarketplaceItemMutation.mutateAsync(payload);
        Alert.alert("Tienda", "Artículo agregado correctamente.", [
          { text: "Aceptar", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error("No se pudo guardar el artículo:", error);
      Alert.alert(
        "Error",
        "No pudimos guardar el artículo. Intenta nuevamente en unos minutos."
      );
    }
  };

  const handleDelete = () => {
    if (!itemId || isDeleting) return;

    Alert.alert(
      "Eliminar artículo",
      "Esta acción no se puede deshacer. ¿Deseas eliminar este artículo de la tienda?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMarketplaceItemMutation.mutateAsync(itemId);
              Alert.alert("Tienda", "Artículo eliminado correctamente.", [
                {
                  text: "Aceptar",
                  // Back to the list: the item's own screen no longer exists.
                  onPress: () => router.dismissTo("/private/marketplace/MarketplaceList"),
                },
              ]);
            } catch (error) {
              console.error("No se pudo eliminar el artículo:", error);
              Alert.alert(
                "Error",
                "No pudimos eliminar el artículo. Intenta nuevamente en unos minutos."
              );
            }
          },
        },
      ]
    );
  };

  const heading = isEditing ? "Editar artículo" : "Nuevo artículo";

  if (user?.role !== "admin") {
    return (
      <Screen scroll={false}>
        <ScreenHeader nav="close" eyebrow="Tienda" title="Permiso denegado" />
        <AppText tone="muted" className="px-5 pt-3 text-[14.5px] leading-[20px]">
          Solo los administradores pueden acceder a este formulario de la tienda.
        </AppText>
      </Screen>
    );
  }

  // The list holds the item: wait for it, and say so if it's gone.
  if (isEditing && !existingItem) {
    return (
      <Screen scroll={false}>
        <ScreenHeader nav="close" eyebrow="Tienda" title={heading} />
        <View className="flex-1">
          <DataLoader query={itemsQuery} emptyMessage="No encontramos este artículo.">
            {() => (
              <AppText tone="muted" className="px-5 pt-3 text-[14.5px] leading-[20px]">
                No encontramos este artículo. Puede que haya sido eliminado recientemente.
              </AppText>
            )}
          </DataLoader>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      form
      footer={
        <FormActions
          saveLabel={isEditing ? "Guardar cambios" : "Guardar artículo"}
          onSave={handleSubmit}
          loading={isSaving}
          hasErrors={Object.keys(errors).length > 0}
        />
      }
    >
      <ScreenHeader nav="close" eyebrow="Tienda" title={heading} />

      <Card className="mx-3 mt-4 gap-3">
        <SectionTitle title="Fotos" />
        <View>
          {primaryImage ? (
            <View className="h-[170px] overflow-hidden rounded-[14px]">
              <Pressable
                onPress={handleSelectPrimaryImage}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Reemplazar imagen principal"
                className="h-full w-full"
              >
                <Image source={{ uri: primaryImage.uri }} className="h-full w-full" resizeMode="cover" />
              </Pressable>
              <View pointerEvents="none" className="absolute bottom-2.5 left-2.5 rounded-md bg-surface px-2 py-1">
                <AppText variant="label" tone="muted" className="text-[10px]">
                  Imagen principal
                </AppText>
              </View>
              <View className="absolute right-1.5 top-1.5">
                <IconButton
                  icon="close"
                  size={30}
                  onPress={handleRemovePrimaryImage}
                  disabled={isSaving}
                  accessibilityLabel="Quitar imagen principal"
                />
              </View>
            </View>
          ) : (
            <Pressable
              onPress={handleSelectPrimaryImage}
              disabled={isSaving}
              accessibilityRole="button"
              className="h-[170px] items-center justify-center gap-1.5 rounded-[14px] border-2 border-dashed border-faint"
            >
              <Ionicons name="image-outline" size={26} color={palette.ink} />
              <AppText variant="bold" className="text-[15px]">
                Seleccionar imagen principal
              </AppText>
              <AppText tone="muted" className="text-[12.5px]">
                La que se ve primero en la tienda
              </AppText>
            </Pressable>
          )}
          <FieldError message={errors.hasPrimaryImage} />
        </View>

        <View className="flex-row flex-wrap gap-2">
          {galleryImages.map((image) => (
            <View key={image.id} className="h-16 w-16 overflow-hidden rounded-xl">
              <Image source={{ uri: image.uri }} className="h-full w-full" resizeMode="cover" />
              <View className="absolute right-1 top-1">
                <IconButton
                  icon="close"
                  size={22}
                  onPress={() => handleRemoveGalleryImage(image.id)}
                  disabled={isSaving}
                  accessibilityLabel="Eliminar imagen de la galería"
                />
              </View>
            </View>
          ))}
          <Pressable
            onPress={handleAddGalleryImage}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Agregar a la galería"
            className="h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-faint"
          >
            <Ionicons name="add" size={22} color={palette.ink} />
          </Pressable>
        </View>
      </Card>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <SectionTitle title="Información" />
        <Field
          label="Nombre *"
          value={name}
          onChangeText={setName}
          placeholder="Nombre del artículo"
          error={errors.name}
        />
        <Field
          label="Resumen"
          value={shortDescription}
          onChangeText={setShortDescription}
          placeholder="Resumen del artículo"
        />
        <Field
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Detalles adicionales, cuidados, tallas, etc."
          multiline
        />
      </Card>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <SectionTitle title="Precio y referencia" />
        <View className="flex-row gap-2.5">
          <Field
            label="Categoría"
            value={category}
            onChangeText={setCategory}
            placeholder="Ropa, Accesorios…"
            className="flex-1"
          />
          <Field
            label="Referencia"
            value={itemCode}
            onChangeText={setItemCode}
            placeholder="SKU"
            autoCapitalize="characters"
            className="flex-1"
          />
        </View>
        <View className="flex-row items-start gap-2.5">
          <Field
            label="Precio *"
            prefix="₡"
            value={price}
            onChangeText={setPrice}
            placeholder="12000"
            keyboardType="numeric"
            error={errors.price}
            className="flex-[2]"
          />
          {/* The store only sells in colones. */}
          <Field label="Moneda" value="CRC" editable={false} className="flex-1" />
        </View>
      </Card>

      <Card className="mx-3 mt-2.5">
        <SwitchRow
          title="Artículo activo"
          hint={active ? "Los estudiantes lo ven en la tienda" : "Oculto en la tienda"}
          value={active}
          onChange={setActive}
        />
      </Card>

      {isEditing && (
        <Button
          label="Eliminar artículo"
          variant="danger"
          icon="trash-outline"
          onPress={handleDelete}
          loading={isDeleting}
          className="mx-3 mt-4"
        />
      )}
    </Screen>
  );
};

export default MarketplaceAdminForm;
