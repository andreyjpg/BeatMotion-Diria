import zod from "zod";
import { timestampSchema } from "../enrollment/schema";

/** public.branches columns renamed to the fields the app uses. */
export const BRANCH_COLUMNS =
  "id, name, location, createdBy:created_by, createdAt:created_at, updatedAt:updated_at, isDeleted:is_deleted";

export const branchSchema = zod.object({
  id: zod.string(),
  name: zod.string().min(2).max(100),
  location: zod.string().min(2).max(200),
  createdBy: zod.string().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  isDeleted: zod.boolean(),
});

export const branchListSchema = zod.array(branchSchema);

export type BranchType = zod.infer<typeof branchSchema>;
