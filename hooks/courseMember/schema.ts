import { ageOn, birthdayBetween, parseLocalDate, summarizeAges } from "@/constants/helpers";
import zod from "zod";
import { dateTimeSchema } from "../common/schema";
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
  joinedAt: dateTimeSchema,
  active: zod.boolean(),
  paymentStatus: zod.enum(["pending", "late", "ok"]),
  nextPaymentDate: zod.date().nullable(), // local date from toMember
  createdBy: zod.string().nullable(),
  createdAt: dateTimeSchema,
};

const courseMemberSchema = zod.array(zod.object(memberFields));

const membersByCourseSchema = zod.array(
  zod.object({ ...memberFields, userInfo: userSchema }),
);

export type CourseMember = zod.infer<typeof courseMemberSchema>;
export { courseMemberSchema, membersByCourseSchema };

/** What toCourseAges reads from each member of useMembersByCourse. */
type MemberAgeFields = {
  active: boolean;
  userInfo: { birthDate?: string | null; isActive: boolean };
};

/**
 * Ages of a course's current students on `date` (default today), for the age
 * charts on the course screens. Ended memberships and deactivated accounts
 * aren't counted, not even as missing a birth date (like the birthdays on the
 * teacher's home).
 */
export const toCourseAges = (members: MemberAgeFields[], date = new Date()) =>
  summarizeAges(
    members
      .filter((member) => member.active && member.userInfo.isActive)
      .map((member) => member.userInfo.birthDate),
    date,
  );

/**
 * A membership with its course title and the student's birth date, for the
 * birthdays on the teacher's home. Both embeds are inner joins, so the hook can
 * filter on them (the teacher's courses, students with a birth date).
 */
export const MEMBER_BIRTHDAY_COLUMNS =
  "userId:user_id, course:courses!inner(title), student:profiles!course_members_user_id_fkey!inner(name, lastName:last_name, birthDate:birth_date, photoPath:photo_path)";

export const memberBirthdaySchema = zod.array(
  zod.object({
    userId: zod.string(),
    course: zod.object({ title: zod.string() }),
    student: zod.object({
      name: zod.string(),
      lastName: zod.string(),
      birthDate: zod.string(), // "YYYY-MM-DD"; the hook only reads students who have one
      photoPath: zod.string().nullable(),
    }),
  }),
);

type MemberBirthdayRow = zod.infer<typeof memberBirthdaySchema>[number];

/** A student with a birthday in the week, once even when they're in several of the teacher's courses. */
export type WeekBirthday = {
  userId: string;
  name: string;
  lastName: string;
  photoPath: string | null;
  /** Titles of the teacher's courses the student is in, alphabetically. */
  courses: string[];
  /** The day of the week the birthday falls on (local midnight). */
  birthday: Date;
  /** The age they turn that day. */
  turns: number;
};

/** A WeekBirthday with the signed URL of the student's picture (null without one). */
export type TeacherBirthday = WeekBirthday & { photoURL: string | null };

/**
 * Memberships -> the students whose birthday falls between `week.start` and
 * `week.end`, one per student with all their course titles, by day and then
 * by name.
 */
export const toWeekBirthdays = (rows: MemberBirthdayRow[], week: { start: Date; end: Date }) => {
  const byStudent = new Map<string, WeekBirthday>();
  for (const row of rows) {
    const seen = byStudent.get(row.userId);
    if (seen) {
      seen.courses.push(row.course.title);
      continue;
    }
    const birthday = birthdayBetween(row.student.birthDate, week.start, week.end);
    if (!birthday) continue;
    const turns = ageOn(row.student.birthDate, birthday);
    if (turns === null) continue;
    byStudent.set(row.userId, {
      userId: row.userId,
      name: row.student.name,
      lastName: row.student.lastName,
      photoPath: row.student.photoPath,
      courses: [row.course.title],
      birthday,
      turns,
    });
  }
  const birthdays = [...byStudent.values()];
  for (const student of birthdays) student.courses.sort((a, b) => a.localeCompare(b, "es"));
  return birthdays.sort(
    (a, b) =>
      a.birthday.getTime() - b.birthday.getTime() ||
      `${a.name} ${a.lastName}`.localeCompare(`${b.name} ${b.lastName}`, "es"),
  );
};
