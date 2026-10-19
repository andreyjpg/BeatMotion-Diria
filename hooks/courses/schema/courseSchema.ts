import { parseLocalDate } from "@/constants/helpers";
import zod from "zod";
import { courseMemberSchema } from "../../courseMember/schema";

/**
 * public.courses columns renamed to the fields the app uses, plus the
 * teacher's name (courses store the teacher's profile id).
 */
export const COURSE_COLUMNS =
  "id, title, description, level, day, startDate:start_date, branchId:branch_id, teacherId:teacher_id, createdBy:created_by, isDeleted:is_deleted, createdAt:created_at, updatedAt:updated_at, teacherProfile:profiles!courses_teacher_id_fkey(name, lastName:last_name)";

type CourseRow = {
  level: number;
  startDate: string | null;
  teacherProfile: { name: string; lastName: string } | null;
};

type Course<T extends CourseRow> = Omit<T, "teacherProfile" | "level" | "startDate"> & {
  level: string;
  startDate: Date | null;
  teacher: string;
};

/** Database row -> the shape screens use: teacher name, level as "0"-"3". */
export function toCourse<T extends CourseRow>(row: T): Course<T> {
  const { teacherProfile, ...course } = row;
  return {
    ...course,
    level: String(row.level),
    startDate: parseLocalDate(row.startDate),
    teacher: teacherProfile ? `${teacherProfile.name} ${teacherProfile.lastName}`.trim() : "Sin asignar",
  } as Course<T>;
}

export const courseSchema = zod.array(
  zod.object({
    id: zod.string(),
    title: zod.string().min(2).max(200),
    teacher: zod.string(),
    teacherId: zod.string().nullable(),
    description: zod.string().min(0).max(1000),
    isDeleted: zod.boolean(),
    level: zod.enum(["0", "1", "2", "3"]),
    createdBy: zod.string().nullable(),
    day: zod.string().min(2).max(50).nullish(),
    startDate: zod.date().nullable(), // local date from toCourse
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
