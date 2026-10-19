import zod from "zod";

/*
 * Report totals as returned by the database functions payment_report,
 * enrollment_report and attendance_report. `month` is "YYYY-MM" (Costa Rica),
 * oldest first, including months with nothing.
 */

export const PaymentReportSchema = zod.object({
  totalPayments: zod.number(),
  approvedPayments: zod.number(),
  pendingPayments: zod.number(),
  rejectedPayments: zod.number(),
  totalRevenue: zod.number(),
  latePaymentsCount: zod.number(),
  latePaymentsRevenue: zod.number(),
  paymentsByMonth: zod.array(
    zod.object({
      month: zod.string(),
      count: zod.number(),
      amount: zod.number(),
    })
  ),
});

export const AttendanceReportSchema = zod.object({
  totalClasses: zod.number(),
  totalAttendanceRecords: zod.number(),
  attendedCount: zod.number(),
  absentCount: zod.number(),
  attendanceRate: zod.number(),
  attendanceByCourse: zod.array(
    zod.object({
      courseId: zod.string(),
      courseName: zod.string(),
      totalClasses: zod.number(),
      totalAttendance: zod.number(),
      attendanceRate: zod.number(),
    })
  ),
});

export const EnrollmentReportSchema = zod.object({
  totalEnrollments: zod.number(),
  approvedEnrollments: zod.number(),
  pendingEnrollments: zod.number(),
  rejectedEnrollments: zod.number(),
  enrollmentsByCourse: zod.array(
    zod.object({
      courseId: zod.string(),
      courseName: zod.string(),
      count: zod.number(),
      approvedCount: zod.number(),
    })
  ),
  enrollmentsByMonth: zod.array(
    zod.object({
      month: zod.string(),
      count: zod.number(),
    })
  ),
});

export type PaymentReport = zod.infer<typeof PaymentReportSchema>;
export type AttendanceReport = zod.infer<typeof AttendanceReportSchema>;
export type EnrollmentReport = zod.infer<typeof EnrollmentReportSchema>;
