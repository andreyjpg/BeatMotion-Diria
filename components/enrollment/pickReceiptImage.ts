import type { ReceiptImage } from "@/hooks/receipts/receiptStorage";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

/**
 * Lets the student choose the receipt from their gallery. No cropping: on iOS
 * the editor forces a square, which cut off tall transfer screenshots.
 */
export const pickReceiptImage = async (): Promise<ReceiptImage | null> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== "granted") {
    Alert.alert(
      "Permiso necesario",
      "📸 Necesitamos acceso a tu galería para que puedas subir la imagen del comprobante de pago. Este permiso solo se usa para verificar tus pagos."
    );
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
