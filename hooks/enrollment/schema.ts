import zod from "zod";

/**
 * Firestore-era timestamps (Timestamp objects, Dates or strings). Still used by
 * the sections that haven't moved to Supabase; new schemas use dateTimeSchema.
 */
export const timestampSchema = zod
  .any()
  .nullish()
  .transform((value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value.toDate) return value.toDate();
    if (
      typeof value === "object" &&
      "seconds" in value &&
      "nanoseconds" in value
    ) {
      return new Date(value.seconds * 1000 + value.nanoseconds / 1_000_000);
    }
    if (typeof value === "string") return new Date(value);
    return null;
  });

/** Postgres timestamptz (ISO string) -> Date. */
export const dateTimeSchema = zod.string().transform((value) => new Date(value));

export const reviewStatusSchema = zod.enum(["pending", "approved", "rejected"]);
export type ReviewStatus = zod.infer<typeof reviewStatusSchema>;

/**
 * public.enrollments columns renamed to the fields the app uses. An enrollment
 * is one request (receipt, total, status) for one or more courses
 * (public.enrollment_courses).
 */
export const ENROLLMENT_COLUMNS =
  "id, userId:user_id, status, source, totalAmount:total_amount, receiptPath:payment_proof_path, annualFeeYear:annual_fee_year, submittedAt:submitted_at, reviewedBy:reviewed_by, reviewedAt:reviewed_at, enrollmentCourses:enrollment_courses(courseId:course_id)";

/** Same request with each course (and its branch) and the student, for the admin screens. */
export const ENROLLMENT_DETAIL_COLUMNS =
  "id, userId:user_id, status, source, totalAmount:total_amount, receiptPath:payment_proof_path, annualFeeYear:annual_fee_year, submittedAt:submitted_at, reviewedBy:reviewed_by, reviewedAt:reviewed_at, enrollmentCourses:enrollment_courses(course:courses(id, title, description, level, day, branch:branches(name))), user:profiles!enrollments_user_id_fkey(id, name, lastName:last_name, email)";

/** Database row -> screen shape: the requested course ids as a flat list. */
export function toEnrollment<T extends { enrollmentCourses: { courseId: string }[] }>(row: T) {
  const { enrollmentCourses, ...enrollment } = row;
  return { ...enrollment, courseIds: enrollmentCourses.map(({ courseId }) => courseId) };
}

type EnrollmentDetailRow = {
  receiptPath: string | null;
  enrollmentCourses: { course: object | null }[];
};

/** Database row -> screen shape: flat course list and the receipt's signed URL. */
export function toEnrollmentDetail<T extends EnrollmentDetailRow>(row: T, receiptUrls: Map<string, string>) {
  const { enrollmentCourses, ...enrollment } = row;
  return {
    ...enrollment,
    courses: enrollmentCourses.flatMap(({ course }) => (course ? [course] : [])),
    receiptUrl: row.receiptPath ? (receiptUrls.get(row.receiptPath) ?? null) : null,
  };
}

const enrollmentFields = {
  id: zod.string(),
  userId: zod.string(),
  status: reviewStatusSchema,
  source: zod.enum(["self", "manual"]),
  totalAmount: zod.number().min(0),
  receiptPath: zod.string().nullable(),
  annualFeeYear: zod.number().nullable(),
  submittedAt: dateTimeSchema,
  reviewedBy: zod.string().nullable(),
  reviewedAt: dateTimeSchema.nullable(),
};

export const enrollmentSchema = zod.array(
  zod.object({ ...enrollmentFields, courseIds: zod.array(zod.string()) })
);

export type Enrollment = zod.infer<typeof enrollmentSchema>[number];

export const enrollmentDetailSchema = zod.array(
  zod.object({
    ...enrollmentFields,
    receiptUrl: zod.string().nullable(),
    courses: zod.array(
      zod.object({
        id: zod.string(),
        title: zod.string(),
        description: zod.string(),
        level: zod.number(),
        day: zod.string().nullable(),
        branch: zod.object({ name: zod.string() }).nullable(),
      })
    ),
    user: zod
      .object({
        id: zod.string(),
        name: zod.string(),
        lastName: zod.string(),
        email: zod.string(),
      })
      .nullable(),
  })
);

export type EnrollmentDetail = zod.infer<typeof enrollmentDetailSchema>[number];
