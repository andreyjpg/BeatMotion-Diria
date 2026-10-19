import { toHHMM } from "@/constants/helpers";
import zod from "zod";
import { dateTimeSchema } from "../common/schema";

/** public.classes columns renamed to the fields the app uses. */
export const CLASS_COLUMNS =
  "id, courseId:course_id, title, description, objectives, content, date, startTime:start_time, endTime:end_time, capacity, videoLinks:video_links, isDeleted:is_deleted, createdAt:created_at, updatedAt:updated_at";

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
