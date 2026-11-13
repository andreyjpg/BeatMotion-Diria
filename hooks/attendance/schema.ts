import zod from "zod";
import { dateTimeSchema } from "../common/schema";

/**
 * public.attendance columns renamed to the fields the app uses. One row per
 * class and student (primary key class_id + user_id): the student's RSVP and
 * whether the teacher marked them present.
 */
export const ATTENDANCE_COLUMNS =
  "classId:class_id, userId:user_id, attended, rsvpStatus:rsvp_status, createdAt:created_at, updatedAt:updated_at";

/** Plus the class's course and deleted flag, to filter a student's rows by course. */
export const ATTENDANCE_WITH_CLASS_COLUMNS =
  "classId:class_id, userId:user_id, attended, rsvpStatus:rsvp_status, createdAt:created_at, updatedAt:updated_at, class:classes!inner(course_id, is_deleted)";

/** course_classes_with_attendance rows renamed to the fields the app uses. */
export const TAKEN_CLASS_COLUMNS = "classId:class_id, date";

/** Classes where attendance was taken (someone was marked present), with their date "YYYY-MM-DD". */
export const TakenClassSchemaArray = zod.array(
  zod.object({
    classId: zod.string(),
    date: zod.string(),
  }),
);

export type TakenClass = zod.infer<typeof TakenClassSchemaArray>[number];

export const rsvpStatusSchema = zod.enum(["leaders", "followers", "no_asistira"]);
export type RsvpStatus = zod.infer<typeof rsvpStatusSchema>;

/** RSVP errors raised by the database (trigger guard_attendance_write), as shown to the student. */
export const RSVP_ERROR_MESSAGES: Record<string, string> = {
  // An admin hid the class after the reminder or the screen loaded.
  CLASS_HIDDEN: "Esta clase ya no está disponible.",
};

const AttendanceSchema = zod.object({
  classId: zod.string(),
  userId: zod.string(),
  attended: zod.boolean(),
  rsvpStatus: rsvpStatusSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

const AttendanceSchemaArray = zod.array(AttendanceSchema);

type AttendanceType = zod.infer<typeof AttendanceSchema>;

export { AttendanceSchema, AttendanceSchemaArray, AttendanceType };
