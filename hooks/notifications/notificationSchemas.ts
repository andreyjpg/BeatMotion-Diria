import zod from "zod";
import { dateTimeSchema } from "../enrollment/schema";

/** public.notifications columns renamed to the fields the app uses. */
export const NOTIFICATION_COLUMNS = "id, title, content, data, read, createdAt:created_at";

/** public.notification_drafts columns. */
export const DRAFT_COLUMNS =
  "id, title, content, recipients, createdAt:created_at, updatedAt:updated_at";

/** public.notification_broadcasts columns (notifications already sent). */
export const BROADCAST_COLUMNS =
  "id, title, content, recipients, sentBy:sent_by, createdAt:created_at";

export const audienceSchema = zod.enum(["all", "user", "teacher"]);
export type Audience = zod.infer<typeof audienceSchema>;

export const AUDIENCE_LABELS: Record<Audience, string> = {
  all: "Todos los usuarios",
  user: "Estudiantes",
  teacher: "Instructores",
};

export const draftSchema = zod.object({
  id: zod.string(),
  title: zod.string(),
  content: zod.string(),
  recipients: audienceSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const draftListSchema = zod.array(draftSchema);

export type Draft = zod.infer<typeof draftSchema>;

export const broadcastSchema = zod.object({
  id: zod.string(),
  title: zod.string(),
  content: zod.string(),
  recipients: audienceSchema,
  sentBy: zod.string().nullable(),
  createdAt: dateTimeSchema,
});

export const broadcastListSchema = zod.array(broadcastSchema);

/** What the draft form saves or sends. */
export type DraftInput = {
  title: string;
  content: string;
  recipients: Audience;
};

export const notificationsSchema = zod.object({
  id: zod.string(),
  title: zod.string(),
  content: zod.string(),
  data: zod.record(zod.string(), zod.unknown()).nullable(),
  read: zod.boolean(),
  createdAt: dateTimeSchema,
});

export const notificationsList = zod.array(notificationsSchema);

export type Notification = zod.infer<typeof notificationsSchema>;
