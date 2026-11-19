import { toHHMM } from "@/constants/helpers";
import zod from "zod";
import { dateTimeSchema } from "../common/schema";

/**
 * public.classes columns renamed to the fields the app uses. Only staff get
 * hidden classes (isHidden true): for students the database leaves them out.
 */
export const CLASS_COLUMNS =
  "id, courseId:course_id, title, description, objectives, content, date, startTime:start_time, endTime:end_time, capacity, videoLinks:video_links, isDeleted:is_deleted, isHidden:is_hidden, createdAt:created_at, updatedAt:updated_at";

/**
 * What a row of the admin "Clases" list shows: CLASS_COLUMNS without the
 * class's texts and videos, which only its editor needs (it fetches them).
 */
export const CLASS_LIST_COLUMNS =
  "id, courseId:course_id, title, date, startTime:start_time, endTime:end_time, isHidden:is_hidden";

/** Database row -> screen shape: times as "HH:MM" (Postgres sends "HH:MM:SS"). */
export function toClass<T extends { startTime: string | null; endTime: string | null }>(row: T) {
  return { ...row, startTime: toHHMM(row.startTime), endTime: toHHMM(row.endTime) };
}

export const ClassesSchema = zod.object({
  id: zod.string(),
  title: zod.string().nullable(),
  capacity: zod.number().nullish(),
  courseId: zod.string(),
  createdAt: dateTimeSchema,
  date: zod.string().nullable(), // "YYYY-MM-DD"
  description: zod.string().nullish(),
  objectives: zod.string().nullish(),
  startTime: zod.string().nullable(), // "HH:MM"
  endTime: zod.string().nullable(),
  updatedAt: dateTimeSchema,
  isDeleted: zod.boolean(),
  isHidden: zod.boolean(),
  content: zod.string().nullish(),
  videoLinks: zod
    .array(
      zod.object({
        title: zod.string().nullish(),
        url: zod.string().url(),
        platform: zod.string().nullable(),
      }),
    )
    .nullish(),
});

export type ClassesType = zod.infer<typeof ClassesSchema>;

export const ClassesSchemaArray = zod.array(ClassesSchema);

export const ClassListSchema = zod.array(
  ClassesSchema.pick({ id: true, courseId: true, title: true, date: true, startTime: true, endTime: true, isHidden: true }),
);

/** A class as the admin "Clases" list reads it (CLASS_LIST_COLUMNS). */
export type ClassListItem = zod.infer<typeof ClassListSchema>[number];
