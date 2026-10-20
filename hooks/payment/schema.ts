import zod from "zod";
import { dateTimeSchema } from "../common/schema";
import { reviewStatusSchema } from "../enrollment/schema";

/**
 * public.payments columns renamed to the fields the app uses, plus the courses
 * the payment covers (public.payment_courses).
 */
export const PAYMENT_COLUMNS =
  "id, userId:user_id, status, monthlyFare:monthly_fare, lateFare:late_fare, totalAmount:total_amount, isLate:is_late, daysLate:days_late, annualFeeYear:annual_fee_year, receiptPath:proof_path, createdAt:created_at, paymentCourses:payment_courses(course:courses(id, title))";

/** Plus the student's name, for the admin screens. */
export const PAYMENT_DETAIL_COLUMNS = `${PAYMENT_COLUMNS}, user:profiles!payments_user_id_fkey(name, lastName:last_name)`;

type PaymentRow = {
  receiptPath: string | null;
  paymentCourses: { course: { id: string; title: string } | null }[];
};

/** Database row -> screen shape: flat course list and the receipt's signed URL. */
export function toPayment<T extends PaymentRow>(row: T, receiptUrls: Map<string, string>) {
  const { paymentCourses, ...payment } = row;
  return {
    ...payment,
    courses: paymentCourses.flatMap(({ course }) => (course ? [course] : [])),
    receiptUrl: row.receiptPath ? (receiptUrls.get(row.receiptPath) ?? null) : null,
  };
}

const paymentFields = {
  id: zod.string(),
  userId: zod.string(),
  status: reviewStatusSchema,
  monthlyFare: zod.number(),
  lateFare: zod.number(),
  totalAmount: zod.number(),
  isLate: zod.boolean(),
  daysLate: zod.number(),
  annualFeeYear: zod.number().nullable(),
  receiptPath: zod.string().nullable(),
  receiptUrl: zod.string().nullable(),
  createdAt: dateTimeSchema,
  courses: zod.array(zod.object({ id: zod.string(), title: zod.string() })),
};

export const PaymentSchema = zod.array(zod.object(paymentFields));

export type PaymentType = zod.infer<typeof PaymentSchema>[number];

export const PaymentDetailSchema = zod.array(
  zod.object({
    ...paymentFields,
    user: zod.object({ name: zod.string(), lastName: zod.string() }).nullable(),
  })
);

export type PaymentDetail = zod.infer<typeof PaymentDetailSchema>[number];
