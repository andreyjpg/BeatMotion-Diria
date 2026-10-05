import zod from "zod";
import { timestampSchema } from "../enrollment/schema";

const AttendanceSchema = zod.object({
  id: zod.string(),
  courseId: zod.string(),
  classId: zod.string(),
  userId: zod.string(),
  attended: zod.boolean(),
  rsvpStatus: zod.enum(["leaders", "followers", "no_asistira"]).nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema.nullish(),
});

const AttendanceSchemaArray = zod.array(AttendanceSchema);

type AttendanceType = zod.infer<typeof AttendanceSchema>;

export { AttendanceSchema, AttendanceSchemaArray, AttendanceType };
