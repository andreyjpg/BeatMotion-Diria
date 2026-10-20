import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/** A photo chosen on the device (see components/pickImage.ts). */
export type PickedImage = { uri: string; width: number; height: number };

const MAX_SIDE = 1280;

/**
 * At most 1280px on the long side, re-encoded as JPEG (~200 KB for a phone
 * photo), before any upload. Returns the bytes ready for Supabase Storage.
 */
export async function compressImage(image: PickedImage) {
  const context = ImageManipulator.manipulate(image.uri);
  if (Math.max(image.width, image.height) > MAX_SIDE) {
    context.resize(image.width >= image.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return fetch(saved.uri).then((response) => response.arrayBuffer());
}

/** `{folder}/{timestamp}-{random}.jpg` */
export const newImagePath = (folder: string) =>
  `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
