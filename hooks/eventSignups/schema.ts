import zod from "zod";
import { dateTimeSchema } from "../common/schema";

/**
 * public.event_signups columns renamed to the fields the app uses, plus the
 * student's name, email and picture from their profile.
 */
export const EVENT_SIGNUP_COLUMNS =
  "id, eventId:event_id, userId:user_id, status, inviteeCount:invitee_count, totalAttendees:total_attendees, pricePerHead:price_per_head, totalPrice:total_price, isFree:is_free, receiptPath:receipt_path, reviewedBy:reviewed_by, reviewedAt:reviewed_at, createdAt:created_at, updatedAt:updated_at, user:profiles!event_signups_user_id_fkey(name, lastName:last_name, email, photoPath:photo_path)";

type SignupRow = {
  receiptPath: string | null;
  user: { name: string; lastName: string; email: string; photoPath: string | null } | null;
};

/** Database row -> screen shape: student name/email and the signed URLs of their picture and receipt. */
export function toEventSignup<T extends SignupRow>(
  row: T,
  receiptUrls: Map<string, string>,
  photoUrls = new Map<string, string>(),
) {
  const { user, ...signup } = row;
  return {
    ...signup,
    userName: user ? `${user.name} ${user.lastName}`.trim() : "",
    userEmail: user?.email ?? "",
    userPhotoUrl: user?.photoPath ? (photoUrls.get(user.photoPath) ?? null) : null,
    receiptUrl: row.receiptPath ? (receiptUrls.get(row.receiptPath) ?? null) : null,
  };
}

export const signupStatusSchema = zod.enum([
  "pending",
  "approved",
  "rejected",
  "canceled",
  "autoApproved",
]);

export const eventSignupSchema = zod.object({
  id: zod.string(),
  eventId: zod.string(),
  userId: zod.string(),
  userName: zod.string(),
  userEmail: zod.string(),
  userPhotoUrl: zod.string().nullable(),
  inviteeCount: zod.number(),
  totalAttendees: zod.number(),
  pricePerHead: zod.number().nullable(),
  totalPrice: zod.number(),
  status: signupStatusSchema,
  receiptPath: zod.string().nullable(),
  receiptUrl: zod.string().nullable(),
  isFree: zod.boolean(),
  reviewedBy: zod.string().nullable(),
  reviewedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const eventSignupCollectionSchema = zod.array(eventSignupSchema);

export type EventSignup = zod.infer<typeof eventSignupSchema>;
export type EventSignupStatus = EventSignup["status"];

/** Just enough of each signup to total them per event (admin events list). */
export const eventSignupCountRowsSchema = zod.array(
  zod.object({
    eventId: zod.string(),
    status: signupStatusSchema,
    totalAttendees: zod.number(),
  }),
);

/** Which events the student is signed up for (student events list). */
export const myActiveSignupRowsSchema = zod.array(zod.object({ eventId: zod.string() }));

/** Query keys; everything about one event sits under ["eventSignups", "event", id]. */
export const eventSignupsKeys = {
  all: ["eventSignups"] as const,
  allMyActive: ["eventSignups", "myActive"] as const,
  myActive: (userId: string) => ["eventSignups", "myActive", userId] as const,
  allCounts: ["eventSignups", "counts"] as const,
  counts: (eventIds: string[]) => ["eventSignups", "counts", eventIds] as const,
  event: (eventId: string) => ["eventSignups", "event", eventId] as const,
  byEvent: (eventId: string) => ["eventSignups", "event", eventId, "list"] as const,
  mine: (eventId: string, userId: string) => ["eventSignups", "event", eventId, "user", userId] as const,
  spotsTaken: (eventId: string) => ["eventSignups", "event", eventId, "spotsTaken"] as const,
};

/** Signup errors raised by the database (trigger prepare_event_signup). */
export const SIGNUP_ERROR_MESSAGES: Record<string, string> = {
  NO_AVAILABLE_SLOTS:
    "Ya se agotaron los cupos disponibles, pero favor contactar al director de la academia para consultar disponibilidad.",
  EVENT_STARTED: "El evento ya comenzó. No es posible registrarse.",
  EVENT_NOT_AVAILABLE: "Este evento ya no está disponible.",
  RECEIPT_REQUIRED: "Sube la imagen del comprobante de pago.",
};
