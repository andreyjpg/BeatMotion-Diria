import { supabase } from "@/lib/supabase";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * Payment and enrollment receipts live in the private `receipts` bucket under
 * `{user_id}/…`. Rows store the object path; screens get a signed URL.
 */
const BUCKET = "receipts";
const MAX_SIDE = 1280;
const SIGNED_URL_SECONDS = 60 * 60;

export type ReceiptImage = { uri: string; width: number; height: number };

/** At most 1280px on the long side, re-encoded as JPEG (~200 KB per receipt). */
async function compress(image: ReceiptImage) {
  const context = ImageManipulator.manipulate(image.uri);
  if (Math.max(image.width, image.height) > MAX_SIDE) {
    context.resize(image.width >= image.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return saved.uri;
}

/** Uploads a receipt into the user's folder and returns its storage path. */
export async function uploadReceipt(userId: string, image: ReceiptImage) {
  const uri = await compress(image);
  const body = await fetch(uri).then((response) => response.arrayBuffer());
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
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
