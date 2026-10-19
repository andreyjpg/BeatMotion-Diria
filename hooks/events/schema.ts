import zod from "zod";
import { dateTimeSchema } from "../enrollment/schema";
import type { PickedImage } from "../storage/compressImage";
import { mediaUrl } from "../storage/mediaStorage";

/** public.events columns renamed to the fields the app uses. */
export const EVENT_COLUMNS =
  "id, title, description, bannerPath:banner_path, datetime:starts_at, location, category, capacity, price, isPublic:is_public, status, createdBy:created_by, isDeleted:is_deleted, createdAt:created_at, updatedAt:updated_at";

export const eventStatusSchema = zod.enum(["draft", "published"]);
export type EventStatus = zod.infer<typeof eventStatusSchema>;

/** Database row -> screen shape: the banner's public URL ("" without banner). */
export function toEvent<T extends { bannerPath: string | null }>(row: T) {
  return { ...row, bannerUrl: row.bannerPath ? mediaUrl(row.bannerPath) : "" };
}

export const eventSchema = zod.object({
  id: zod.string(),
  title: zod.string(),
  description: zod.string(),
  bannerPath: zod.string().nullable(),
  bannerUrl: zod.string(),
  datetime: dateTimeSchema,
  location: zod.string(),
  category: zod.string(),
  capacity: zod.number().nullable(),
  price: zod.number().nullable(),
  isPublic: zod.boolean(),
  status: eventStatusSchema,
  createdBy: zod.string().nullable(),
  isDeleted: zod.boolean(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const eventCollectionSchema = zod.array(eventSchema);

export type Event = zod.infer<typeof eventSchema>;

/** What the event form saves (useCreateEvent / useUpdateEvent). */
export type EventInput = {
  title: string;
  description: string;
  datetime: Date;
  location: string;
  category: string;
  capacity: number | null;
  price: number | null;
  isPublic: boolean;
  status: EventStatus;
  /** A new banner picked on the device; null keeps the current one. */
  banner: PickedImage | null;
};

/** EventInput -> public.events columns (everything but the banner). */
export const toEventRow = (input: EventInput) => ({
  title: input.title.trim(),
  description: input.description.trim(),
  starts_at: input.datetime.toISOString(),
  location: input.location.trim(),
  category: input.category,
  capacity: input.capacity,
  price: input.price,
  is_public: input.isPublic,
  status: input.status,
});
