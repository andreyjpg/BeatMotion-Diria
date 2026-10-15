import zod from "zod";
import { timestampSchema } from "../enrollment/schema";

/**
 * Columns of public.profiles, renamed to the camelCase fields the app uses.
 * Use it in every profiles select so rows match userSchema. (Kept as a single
 * literal so supabase-js can infer the row type from it.)
 */
export const PROFILE_COLUMNS =
  "id, email, name, lastName:last_name, phone, role, photoURL:photo_url, isActive:is_active, consentAccepted:consent_accepted, consentAcceptedAt:consent_accepted_at, createdAt:created_at";

// Name lengths are enforced by the forms; profiles created before that (or
// imported from Firebase) may have shorter or empty names.
export const userSchema = zod
  .object({
    id: zod.string(),
    email: zod.string().email(),
    name: zod.string().max(100),
    lastName: zod.string().max(100),
    phone: zod.string().nullish(),
    role: zod.enum(["user", "admin", "teacher"]),
    photoURL: zod.string().url().nullish(),
    isActive: zod.boolean(),
    createdAt: timestampSchema,
    consentAccepted: zod.boolean().optional(),
    consentAcceptedAt: timestampSchema.optional(),
  })
  .transform((user) => ({
    ...user,
    fullName: `${user.name} ${user.lastName}`,
  }));

export const userListSchema = zod.array(userSchema);

export type ProfilePayload = {
  uid: string;
  body: {
    phone: string;
    name: string;
    lastName: string;
    role?: string;
  };
};
