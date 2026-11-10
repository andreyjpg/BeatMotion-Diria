import { supabase } from "@/lib/supabase";
import { compressImage, newImagePath, PickedImage } from "./compressImage";
import { signUrls } from "./signUrls";

/**
 * Profile pictures live in the private `avatars` bucket under `{user_id}/…`.
 * `profiles.photo_path` stores the object path; screens get a signed URL, which
 * only the owner and staff can request.
 */
const BUCKET = "avatars";
const MAX_SIDE = 512;

/** Uploads a picture into the user's folder and returns its storage path. */
export async function uploadAvatar(userId: string, image: PickedImage) {
  const body = await compressImage(image, MAX_SIDE);
  const path = newImagePath(userId);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

/**
 * Signed URLs by path. Best effort: without one the person shows their initials,
 * so a failure is logged instead of failing the whole list.
 */
export async function signAvatarUrls(paths: (string | null | undefined)[]) {
  try {
    return await signUrls(BUCKET, paths);
  } catch (error) {
    console.warn("Could not sign profile pictures:", error);
    return new Map<string, string>();
  }
}

/** Adds `photoURL` (the signed URL, or null) to a row that has `photoPath`. */
export const withPhotoUrl = <T extends { photoPath?: string | null }>(row: T, urls: Map<string, string>) => ({
  ...row,
  photoURL: row.photoPath ? (urls.get(row.photoPath) ?? null) : null,
});

/**
 * Deletes the user's pictures except `keepPath`, including any left by a save
 * that failed. Best effort: a leftover file only takes space, so a failure is
 * logged instead of failing the save.
 */
export async function removeAvatars(userId: string, keepPath?: string) {
  const bucket = supabase.storage.from(BUCKET);
  const { data, error } = await bucket.list(userId);
  if (error) {
    console.warn("Could not list old pictures:", error.message);
    return;
  }
  const paths = data.map((file) => `${userId}/${file.name}`).filter((path) => path !== keepPath);
  if (paths.length === 0) return;
  const { error: removeError } = await bucket.remove(paths);
  if (removeError) console.warn("Could not delete old pictures:", removeError.message);
}
