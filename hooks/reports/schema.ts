import zod from "zod";

/*
 * Report totals as returned by the database functions payment_report,
 * enrollment_report, attendance_report and age_report. `month` is "YYYY-MM"
 * (Costa Rica), oldest first, including months with nothing.
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

/**
 * Active students per exact age today in Costa Rica (youngest first, only ages
 * someone has), the ones without a birth date, and their exact mean age (null
 * when nobody has a birth date).
 */
export const AgeReportSchema = zod.object({
  ages: zod.array(
    zod.object({
      age: zod.number(),
      count: zod.number(),
    })
  ),
  withoutBirthDate: zod.number(),
  averageAge: zod.number().nullable(),
});

export type PaymentReport = zod.infer<typeof PaymentReportSchema>;
export type AttendanceReport = zod.infer<typeof AttendanceReportSchema>;
export type EnrollmentReport = zod.infer<typeof EnrollmentReportSchema>;
export type AgeReport = zod.infer<typeof AgeReportSchema>;
