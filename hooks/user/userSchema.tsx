import zod from "zod";
import { dateTimeSchema } from "../common/schema";
import { liveMembershipChangeSchema, type LiveMembershipChange } from "../membership/schema";

/**
 * Columns of public.profiles, renamed to the camelCase fields the app uses.
 * Use it in every profiles select so rows match userSchema. (Kept as a single
 * literal so supabase-js can infer the row type from it.)
 */
export const PROFILE_COLUMNS =
  "id, email, name, lastName:last_name, phone, birthDate:birth_date, role, photoPath:photo_path, isActive:is_active, consentAccepted:consent_accepted, consentAcceptedAt:consent_accepted_at, createdAt:created_at";

// Name lengths are enforced by the forms; older profiles may have shorter or
// empty names.
export const userSchema = zod
  .object({
    id: zod.string(),
    email: zod.string().email(),
    name: zod.string().max(100),
    lastName: zod.string().max(100),
    phone: zod.string().nullish(),
    birthDate: zod.string().nullish(), // "YYYY-MM-DD"; empty for accounts that never added it
    role: zod.enum(["user", "admin", "teacher"]),
    photoPath: zod.string().nullish(),
    photoURL: zod.string().url().nullish(), // signed URL from withPhotoUrl
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
 * payment stands (course_members), and its live membership changes (useUsers
 * keeps the scheduled ones and the ones applied).
 */
export const USER_LIST_COLUMNS =
  "id, email, name, lastName:last_name, phone, birthDate:birth_date, role, photoPath:photo_path, isActive:is_active, memberships:course_members!course_members_user_id_fkey(active, paymentStatus:payment_status, nextPaymentDate:next_payment_date, course:courses(title)), changes:membership_changes!membership_changes_user_id_fkey(kind, status)";

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
  changes: { kind: "drop" | "cancel" | "pause"; status: "scheduled" | "applied" | "withdrawn" | "ended" }[];
};

/**
 * A student's change in progress: a pause that started, or the one change
 * waiting for its date. A drop or cancel already applied isn't in progress.
 */
const listMembershipChangeOf = (changes: ListRow["changes"]): LiveMembershipChange | null => {
  if (changes.some((change) => change.kind === "pause" && change.status === "applied")) return "paused";
  const scheduled = changes.find((change) => change.status === "scheduled");
  if (!scheduled) return null;
  if (scheduled.kind === "pause") return "pauseScheduled";
  return scheduled.kind === "cancel" ? "cancelScheduled" : "dropScheduled";
};

/**
 * Database row -> list card: titles of the active courses, the worst payment
 * status among them (one late course makes the student late), the earliest
 * due date and the change in progress. Students without courses get null for
 * the payment fields.
 */
export function toUserListItem<T extends ListRow>(row: T) {
  const { memberships, changes, ...profile } = row;
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
    membershipChange: listMembershipChangeOf(changes),
  };
}

export const userListItemSchema = zod.object({
  id: zod.string(),
  email: zod.string(),
  name: zod.string(),
  lastName: zod.string(),
  phone: zod.string().nullable(),
  birthDate: zod.string().nullable(), // "YYYY-MM-DD"; empty for accounts that never added it
  role: zod.enum(["user", "admin", "teacher"]),
  photoURL: zod.string().nullable(),
  isActive: zod.boolean(),
  courses: zod.array(zod.string()),
  paymentStatus: paymentStandingSchema.nullable(),
  nextPaymentDate: zod.string().nullable(), // "YYYY-MM-DD"
  membershipChange: liveMembershipChangeSchema.nullable(),
});

export const userListSchema = zod.array(userListItemSchema);

export type UserListItem = zod.infer<typeof userListItemSchema>;

export type ProfilePayload = {
  uid: string;
  body: {
    phone: string;
    name: string;
    lastName: string;
    /** "YYYY-MM-DD", or null to clear it; left out, it stays as it is. */
    birthDate?: string | null;
    role?: string;
  };
};
