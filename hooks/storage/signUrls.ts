import { supabase } from "@/lib/supabase";

const SIGNED_URL_SECONDS = 60 * 60;

/**
 * Signed URLs (valid for an hour) of a private bucket's files, by path, in one
 * request. Files that don't exist or the user can't read are left out.
 */
export async function signUrls(bucket: string, paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((path): path is string => !!path))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) throw error;
  for (const item of data) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
