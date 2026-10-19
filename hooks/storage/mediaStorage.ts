import { supabase } from "@/lib/supabase";
import { compressImage, newImagePath, PickedImage } from "./compressImage";

/**
 * Event banners and marketplace photos live in the public `media` bucket
 * (only admins upload or delete). Rows store the object path.
 */
const BUCKET = "media";

export type MediaFolder = "events" | "marketplace";

/** Uploads an image and returns its storage path. */
export async function uploadMedia(folder: MediaFolder, image: PickedImage) {
  const body = await compressImage(image);
  const path = newImagePath(folder);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

/** Public URL of a stored image (no request: it's built from the path). */
export const mediaUrl = (path: string) =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

/**
 * Deletes images that are no longer used. Best effort: a leftover file only
 * takes space, so a failure is logged instead of failing the save.
 */
export async function removeMedia(paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.warn("Could not delete old images:", error.message);
}
