import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import InfoRow from "@/components/ui/InfoRow";
import { formatCourseSchedule, formatCurrency, formatDayMonth, joinWithAnd, monthlyFareFor, planName } from "@/constants/helpers";
import { useBranches } from "@/hooks/branches/useBranches";
import type { CourseSchemaWithMember } from "@/hooks/courses/schema/courseSchema";
import type { Fare } from "@/hooks/fares/schema";
import { appliesToday, lastDayBefore } from "@/hooks/membership/membershipRules";

type DropCoursesFormProps = {
  /** The student's active courses. */
  courses: CourseSchemaWithMember[];
  selectedIds: string[];
  onToggle: (courseId: string) => void;
  /** When the drop starts (the preview's effective date). */
  effectiveDate: Date | null;
  fares: Fare[] | undefined;
  /** For an admin: the student's name, so the texts speak about them. */
  studentName?: string;
};

/** Under "Así queda": until when the student attends the courses that leave. */
const keepText = (leavingTitles: string[], effectiveDate: Date, studentName?: string) => {
  const titles = joinWithAnd(leavingTitles);
  if (!studentName) return `Sigues asistiendo a ${titles} hasta el ${formatDayMonth(lastDayBefore(effectiveDate))}.`;
  if (appliesToday(effectiveDate)) return `${studentName} deja ${titles} hoy.`;
  return `${studentName} sigue asistiendo a ${titles} hasta el ${formatDayMonth(lastDayBefore(effectiveDate))}.`;
};

/**
 * The courses to leave, and how the plan and the monthly fare change from
 * when the drop starts. For the student's and the admin's drop screens.
 */
const DropCoursesForm = ({ courses, selectedIds, onToggle, effectiveDate, fares, studentName }: DropCoursesFormProps) => {
  const branchesQuery = useBranches();

  const leaving = courses.filter((course) => selectedIds.includes(course.courseId));
  const isSomeSelected = leaving.length > 0 && leaving.length < courses.length;
  const remainingCount = courses.length - leaving.length;
  const fareNow = monthlyFareFor(fares, courses.length);
  const startsToday = !!studentName && appliesToday(effectiveDate);

  return (
    <>
      <Card padded={false} className="mx-3 mt-4 px-4">
        {courses.map((course, index) => {
          const branch = branchesQuery.data?.find((b) => b.id === course.branchId);
          const where = [formatCourseSchedule(course.day, course.startTime, course.endTime), branch?.name]
            .filter(Boolean)
            .join(" · ");
          return (
            <Checkbox
              key={course.id}
              checked={selectedIds.includes(course.courseId)}
              onChange={() => onToggle(course.courseId)}
              accessibilityLabel={course.title}
              className={`items-center py-3 ${index < courses.length - 1 ? "border-b border-line-soft" : ""}`}
            >
              <AppText variant="bold" className="text-[15px]">
                {course.title}
              </AppText>
              {!!where && (
                <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                  {where}
                </AppText>
              )}
            </Checkbox>
          );
        })}
      </Card>

      {isSomeSelected && effectiveDate && (
        <Card padded={false} className="mx-3 mt-2.5 gap-1 px-4 pb-3 pt-2.5">
          <AppText variant="label-bold" accessibilityRole="header" className="pt-1 text-[12px]">
            Así queda
          </AppText>
          <InfoRow label="Plan">{`${planName(courses.length)} → ${planName(remainingCount)}`}</InfoRow>
          <InfoRow label="Mensualidad">
            <AppText variant="semibold" className="flex-1 text-right text-[14.5px]">
              {`${formatCurrency(fareNow)} → `}
              <AppText variant="heavy" className="text-[14.5px]">
                {formatCurrency(monthlyFareFor(fares, remainingCount))}
              </AppText>
            </AppText>
          </InfoRow>
          <InfoRow label="Desde" divider={false}>
            <AppText variant="heavy" className="flex-1 text-right text-[14.5px]">
              {startsToday ? "Hoy" : formatDayMonth(effectiveDate)}
            </AppText>
          </InfoRow>
          <AppText tone="muted" className="text-[12.5px] leading-[17px]">
            {keepText(
              leaving.map((course) => course.title),
              effectiveDate,
              studentName,
            )}
          </AppText>
        </Card>
      )}
    </>
  );
};

export default DropCoursesForm;
