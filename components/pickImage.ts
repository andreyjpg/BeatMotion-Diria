import type { PickedImage } from "@/hooks/storage/compressImage";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

/**
 * Lets the user choose a photo from their gallery (receipts, event banners,
 * marketplace photos). No cropping: on iOS the editor forces a square, which
 * cut off tall receipt screenshots. Uploads resize it (hooks/storage).
 */
export const pickImage = async (permissionMessage: string): Promise<PickedImage | null> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== "granted") {
    Alert.alert("Permiso necesario", permissionMessage);
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
  });

  if (result.canceled) return null;

  const { uri, width, height } = result.assets[0];
  return { uri, width, height };
};

export const RECEIPT_PERMISSION_MESSAGE =
  "📸 Necesitamos acceso a tu galería para que puedas subir la imagen del comprobante de pago. Este permiso solo se usa para verificar tus pagos.";
