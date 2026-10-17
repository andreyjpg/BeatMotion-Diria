import zod from "zod";
import { dateTimeSchema } from "../enrollment/schema";

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

export const rsvpStatusSchema = zod.enum(["leaders", "followers", "no_asistira"]);
export type RsvpStatus = zod.infer<typeof rsvpStatusSchema>;

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
