import { parseLocalDate } from "@/constants/helpers";
import zod from "zod";
import { timestampSchema } from "../enrollment/schema";
import { userSchema } from "../user/userSchema";

/** public.course_members columns renamed to the fields the app uses. */
export const MEMBER_COLUMNS =
  "id, userId:user_id, courseId:course_id, enrollmentId:enrollment_id, joinedAt:joined_at, active, paymentStatus:payment_status, nextPaymentDate:next_payment_date, createdBy:created_by, createdAt:created_at";

/** next_payment_date is a calendar day; read it as a local date, not UTC. */
export function toMember<T extends { nextPaymentDate: string | null }>(row: T) {
  return { ...row, nextPaymentDate: parseLocalDate(row.nextPaymentDate) };
}

const memberFields = {
  id: zod.string(),
  userId: zod.string(),
  courseId: zod.string(),
  enrollmentId: zod.string().nullable(),
  joinedAt: timestampSchema,
  active: zod.boolean(),
  paymentStatus: zod.enum(["pending", "late", "ok"]),
  nextPaymentDate: timestampSchema.nullable(),
  createdBy: zod.string().nullable(),
  createdAt: timestampSchema,
};

const courseMemberSchema = zod.array(zod.object(memberFields));

const membersByCourseSchema = zod.array(
  zod.object({ ...memberFields, userInfo: userSchema }),
);

export type CourseMember = zod.infer<typeof courseMemberSchema>;
export { courseMemberSchema, membersByCourseSchema };
