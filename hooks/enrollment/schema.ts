import zod from "zod";

export const timestampSchema = zod
  .any()
  .nullable()
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

export const enrollmentSchema = zod.array(
  zod.object({
    id: zod.string(),
    userId: zod.string(),
    courseId: zod.string(),
    status: zod.enum(["pending", "approved", "rejected"]),
    submittedAt: timestampSchema,
    paymentProofImage: zod.string().url().nullish(),
    reviewedBy: zod.string().nullable(),
    reviewedAt: timestampSchema,
    totalAmount: zod.number().min(0),
    course: zod
      .object({
        id: zod.string(),
        title: zod.string(),
        description: zod.string(),
        level: zod.string(),
        day: zod.string().nullish(),
        startDate: timestampSchema,
      })
      .nullish(),
    user: zod
      .object({
        id: zod.string(),
        name: zod.string(),
        lastName: zod.string(),
        email: zod.string().email(),
      })
      .nullish(),

    assignedClass: zod.string().nullable().optional(),
    classAssignedAt: timestampSchema.nullable().optional(),
    classAssignedBy: zod.string().nullable().optional(),
    annualFeeYear: zod.number().nullable().optional(),
  })
);

export type Enrollment = zod.infer<typeof enrollmentSchema>[number];
