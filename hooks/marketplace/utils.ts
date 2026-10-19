import { uploadMedia } from "../storage/mediaStorage";
import type { MarketplaceImageInput } from "./schema";

/** Uploads the newly picked photos and returns every path, in order, without repeats. */
export const resolveImagePaths = async (images: MarketplaceImageInput[]) => {
  const paths = await Promise.all(
    images.map((image) => ("path" in image ? image.path : uploadMedia("marketplace", image.picked))),
  );
  return [...new Set(paths)];
};
