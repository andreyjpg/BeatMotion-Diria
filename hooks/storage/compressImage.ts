import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/** A photo chosen on the device (see components/pickImage.ts). */
export type PickedImage = { uri: string; width: number; height: number };

const MAX_SIDE = 1280;

/**
 * At most 1280px (or `maxSide`) on the long side, re-encoded as JPEG (~200 KB
 * for a phone photo), before any upload. Returns the bytes ready for Supabase
 * Storage.
 */
export async function compressImage(image: PickedImage, maxSide = MAX_SIDE) {
  const context = ImageManipulator.manipulate(image.uri);
  if (Math.max(image.width, image.height) > maxSide) {
    context.resize(image.width >= image.height ? { width: maxSide } : { height: maxSide });
  }
  const rendered = await context.renderAsync();
  // Not fetch(saved.uri): on Android it can answer a file:// URL with a 404, and
  // the error text would be uploaded as the image.
  const { base64 } = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  if (!base64) throw new Error("Could not compress the image");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)).buffer;
}

/** `{folder}/{timestamp}-{random}.jpg` */
export const newImagePath = (folder: string) =>
  `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
