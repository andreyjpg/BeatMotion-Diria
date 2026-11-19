import { useQuery } from "@tanstack/react-query";
import { signAvatarUrls } from "../storage/avatarStorage";

/** Signed URL of a profile picture, for screens that only have its path. */
export const useAvatarUrl = (path?: string | null) => {
  return useQuery({
    queryKey: ["avatarUrl", path],
    queryFn: async () => {
      const urls = await signAvatarUrls([path]);
      return urls.get(path!) ?? null;
    },
    enabled: !!path,
    staleTime: 1000 * 60 * 50, // under the signed URLs' hour
  });
};
