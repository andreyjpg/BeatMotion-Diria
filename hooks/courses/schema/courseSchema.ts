import zod from "zod";
import { courseMemberSchema } from "../../courseMember/schema";
import { timestampSchema } from "../../enrollment/schema";

export const courseSchema = zod.array(
  zod.object({
    id: zod.string(),
    title: zod.string().min(2).max(200),
    teacher: zod.string().min(2).max(100),
    description: zod.string().min(0).max(1000),
    isDeleted: zod.boolean(),
    level: zod.enum(["Inicial", "Intermedio", "Avanzado"]),
    createdBy: zod.string().min(2).max(100).nullable(),
    day: zod.string().min(2).max(50).nullish(),
    startDate: timestampSchema,
    branchId: zod.string().nullable().optional(),
  }),
);

export type CourseType = zod.infer<typeof courseSchema>[number];

export const courseSchemaWithMember = zod.array(
  courseSchema.element.merge(courseMemberSchema.element),
);

export const courseWithMemberElement = courseSchema.element.merge(
  courseMemberSchema.element,
);

export type CourseSchemaWithMember = zod.infer<
  typeof courseSchemaWithMember
>[number];
