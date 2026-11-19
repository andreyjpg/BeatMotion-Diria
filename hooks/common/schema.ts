import zod from "zod";

/** Postgres timestamptz (ISO string) -> Date. */
export const dateTimeSchema = zod.string().transform((value) => new Date(value));
