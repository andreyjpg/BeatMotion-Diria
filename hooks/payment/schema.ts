import zod from "zod";
import { timestampSchema } from "../enrollment/schema";

export const PaymentSchema = zod.array(
  zod.object({
    id: zod.string(),
    userId: zod.string(),
    coursesId: zod.array(zod.string()),
    monthlyFare: zod.number(),
    totalAmount: zod.number(),
    photoProofURL: zod.string(),
    createdAt: timestampSchema,
    status: zod.enum(["approved", "rejected", "pending"]),
    isLatePayment: zod.boolean().nullish(),
    daysAfterPayment: zod.number().nullish(),
    lateFare: zod.number().nullish(),
    annualFeeYear: zod.number().nullable().optional(),
  })
);

export type PaymentType = zod.infer<typeof PaymentSchema>[number];

export enum PaymentStatus {
  "approved" = "approved",
  "rejected" = "rejected",
  "pending" = "pending",
}

export type PaymentCreatePayload = {
  userId: string;
  coursesId: string[];
  monthlyFare: number;
  totalAmount: number;
  photoProofURL: string;
  isLatePayment?: boolean;
  daysAfterPayment?: number;
  status: PaymentStatus;
  lateFare: number;
  annualFeeYear?: number | null;
};
