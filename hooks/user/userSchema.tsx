import zod from "zod";
import { dateTimeSchema } from "../common/schema";

/**
 * Columns of public.profiles, renamed to the camelCase fields the app uses.
 * Use it in every profiles select so rows match userSchema. (Kept as a single
 * literal so supabase-js can infer the row type from it.)
 */
export const PROFILE_COLUMNS =
  "id, email, name, lastName:last_name, phone, role, photoURL:photo_url, isActive:is_active, consentAccepted:consent_accepted, consentAcceptedAt:consent_accepted_at, createdAt:created_at";

// Name lengths are enforced by the forms; older profiles may have shorter or
// empty names.
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
    createdAt: dateTimeSchema,
    consentAccepted: zod.boolean().optional(),
    consentAcceptedAt: dateTimeSchema.nullable().optional(),
  })
  .transform((user) => ({
    ...user,
    fullName: `${user.name} ${user.lastName}`,
  }));

/**
 * Admin user list: each profile with its current courses and how its monthly
 * payment stands (course_members).
 */
export const USER_LIST_COLUMNS =
  "id, email, name, lastName:last_name, phone, role, isActive:is_active, memberships:course_members!course_members_user_id_fkey(active, paymentStatus:payment_status, nextPaymentDate:next_payment_date, course:courses(title))";

export const paymentStandingSchema = zod.enum(["ok", "pending", "late"]);
export type PaymentStanding = zod.infer<typeof paymentStandingSchema>;

const STANDING_RANK: Record<PaymentStanding, number> = { ok: 0, pending: 1, late: 2 };

type ListRow = {
  memberships: {
    active: boolean;
    paymentStatus: PaymentStanding;
    nextPaymentDate: string | null;
    course: { title: string } | null;
  }[];
};

/**
 * Database row -> list card: titles of the active courses, the worst payment
 * status among them (one late course makes the student late) and the earliest
 * due date. Students without courses get null for both.
 */
export function toUserListItem<T extends ListRow>(row: T) {
  const { memberships, ...profile } = row;
  const active = memberships.filter((membership) => membership.active);
  const paymentStatus = active.reduce<PaymentStanding | null>(
    (worst, membership) =>
      worst === null || STANDING_RANK[membership.paymentStatus] > STANDING_RANK[worst]
        ? membership.paymentStatus
        : worst,
    null,
  );
  const nextPaymentDate =
    active
      .map((membership) => membership.nextPaymentDate)
      .filter((date): date is string => date !== null)
      .sort()[0] ?? null;
  return {
    ...profile,
    courses: active.flatMap((membership) => (membership.course ? [membership.course.title] : [])),
    paymentStatus,
    nextPaymentDate,
  };
}

export const userListItemSchema = zod.object({
  id: zod.string(),
  email: zod.string(),
  name: zod.string(),
  lastName: zod.string(),
  phone: zod.string().nullable(),
  role: zod.enum(["user", "admin", "teacher"]),
  isActive: zod.boolean(),
  courses: zod.array(zod.string()),
  paymentStatus: paymentStandingSchema.nullable(),
  nextPaymentDate: zod.string().nullable(), // "YYYY-MM-DD"
});

export const userListSchema = zod.array(userListItemSchema);

export type UserListItem = zod.infer<typeof userListItemSchema>;

export type ProfilePayload = {
  uid: string;
  body: {
    phone: string;
    name: string;
    lastName: string;
    role?: string;
  };
};
