import { parseLocalDate, toHHMM } from "@/constants/helpers";
import zod from "zod";
import { courseMemberSchema } from "../../courseMember/schema";

/**
 * public.courses columns renamed to the fields the app uses, plus the
 * teacher's name. teacher_name is a computed field (database function): students
 * can't read teachers' profiles, so embedding the profile came back empty.
 */
export const COURSE_COLUMNS =
  "id, title, description, level, day, startTime:start_time, endTime:end_time, startDate:start_date, endDate:end_date, branchId:branch_id, teacherId:teacher_id, createdBy:created_by, isDeleted:is_deleted, createdAt:created_at, updatedAt:updated_at, teacherName:teacher_name";

type CourseRow = {
  level: number;
  startTime: string | null;
  endTime: string | null;
  startDate: string | null;
  endDate: string | null;
  teacherName: string | null;
};

type Course<T extends CourseRow> = Omit<T, "teacherName" | "level" | "startDate" | "endDate"> & {
  level: string;
  startDate: Date | null;
  endDate: Date | null;
  teacher: string;
};

/**
 * Database row -> the shape screens use: teacher name, level as "0"-"3",
 * times as "HH:MM" and dates as local days.
 */
export function toCourse<T extends CourseRow>(row: T): Course<T> {
  const { teacherName, ...course } = row;
  return {
    ...course,
    level: String(row.level),
    startTime: toHHMM(row.startTime),
    endTime: toHHMM(row.endTime),
    startDate: parseLocalDate(row.startDate),
    endDate: parseLocalDate(row.endDate),
    teacher: teacherName ?? "Sin asignar",
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
    // Null on courses saved before the schedule existed (and from older builds).
    startTime: zod.string().nullable(), // "HH:MM" from toCourse
    endTime: zod.string().nullable(), // "HH:MM" from toCourse
    startDate: zod.date().nullable(), // local date from toCourse
    endDate: zod.date().nullable(), // local date from toCourse
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
