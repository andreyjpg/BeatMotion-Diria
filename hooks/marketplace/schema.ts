import zod from "zod";
import { dateTimeSchema } from "../common/schema";
import type { PickedImage } from "../storage/compressImage";
import { mediaUrl } from "../storage/mediaStorage";

/** public.marketplace_items columns renamed to the fields the app uses. */
export const MARKETPLACE_COLUMNS =
  "id, itemId:sku, name, description, shortDescription:short_description, category, price, currency, imagePaths:image_paths, active, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

/**
 * Database row -> screen shape: public image URLs (`imageUrl` is the primary
 * one, `gallery` all of them) and a short description fallback.
 */
export function toMarketplaceItem<
  T extends { imagePaths: string[]; description: string | null; shortDescription: string | null },
>(row: T) {
  const images = row.imagePaths.map(mediaUrl);
  return {
    ...row,
    images,
    imageUrl: images[0] ?? null,
    gallery: images,
    shortDescription: row.shortDescription ?? row.description?.slice(0, 100) ?? null,
  };
}

export const marketplaceItemSchema = zod.object({
  id: zod.string(),
  itemId: zod.string().nullable(),
  name: zod.string(),
  description: zod.string().nullable(),
  shortDescription: zod.string().nullable(),
  category: zod.string().nullable(),
  price: zod.number().nonnegative(),
  currency: zod.string(),
  imagePaths: zod.array(zod.string()),
  images: zod.array(zod.string()),
  imageUrl: zod.string().nullable(),
  gallery: zod.array(zod.string()),
  active: zod.boolean(),
  createdBy: zod.string().nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const marketplaceCollectionSchema = zod.array(marketplaceItemSchema);

export type MarketplaceItem = zod.infer<typeof marketplaceItemSchema>;

/** A photo of the item: one already stored, or one just picked on the device. */
export type MarketplaceImageInput = { path: string } | { picked: PickedImage };

/** What the admin form saves (create and update). The first image is the primary one. */
export type MarketplaceItemInput = {
  name: string;
  price: number;
  description: string | null;
  shortDescription: string | null;
  category: string | null;
  itemId: string | null;
  active: boolean;
  images: MarketplaceImageInput[];
};

/** MarketplaceItemInput -> public.marketplace_items columns (images handled by the hooks). */
export const toMarketplaceRow = (input: MarketplaceItemInput) => ({
  name: input.name.trim(),
  price: input.price,
  description: input.description,
  // Same default as before: the first 100 characters of the description.
  short_description: input.shortDescription ?? input.description?.slice(0, 100) ?? null,
  category: input.category,
  sku: input.itemId,
  active: input.active,
  currency: "CRC",
});
