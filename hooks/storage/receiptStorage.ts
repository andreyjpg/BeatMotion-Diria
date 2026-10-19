import { supabase } from "@/lib/supabase";
import { compressImage, newImagePath, PickedImage } from "./compressImage";

/**
 * Payment, enrollment and event receipts live in the private `receipts` bucket
 * under `{user_id}/…`. Rows store the object path; screens get a signed URL.
 */
const BUCKET = "receipts";
const SIGNED_URL_SECONDS = 60 * 60;

/** Uploads a receipt into the user's folder and returns its storage path. */
export async function uploadReceipt(userId: string, image: PickedImage) {
  const body = await compressImage(image);
  const path = newImagePath(userId);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

/** Signed URLs (valid for an hour) by path. Receipts already purged are left out. */
export async function signReceiptUrls(paths: (string | null)[]) {
  const unique = [...new Set(paths.filter((path): path is string => !!path))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) throw error;
  for (const item of data) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
