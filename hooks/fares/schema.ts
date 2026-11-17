import zod from "zod";

const FareSchema = zod.array(
  zod.object({
    id: zod.string(),
    description: zod.string(),
    fare: zod.number(),
    type: zod.string(),
    numCourse: zod.number(),
  })
);

/** A row of public.fares as the app reads it (useFares). */
export type Fare = zod.infer<typeof FareSchema>[number];

export { FareSchema };
