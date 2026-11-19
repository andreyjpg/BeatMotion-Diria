import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip, { type ChipTone } from "@/components/ui/Chip";
import { formatCourseSchedule, formatDayMonth } from "@/constants/helpers";
import type { CourseSchemaWithMember } from "@/hooks/courses/schema/courseSchema";
import { leavingDateOf } from "@/hooks/membership/membershipRules";
import type { MembershipChange } from "@/hooks/membership/schema";
import { View } from "react-native";

type CourseChip = { label: string; tone: ChipTone };

/** A course's chip: paused, leaving on a date, or late; null when none applies. */
const courseChip = (course: CourseSchemaWithMember, change: MembershipChange | null): CourseChip | null => {
  if (course.pausedUntil) return { label: "En pausa", tone: "muted" };
  const leavesOn = leavingDateOf(course.courseId, change);
  if (leavesOn) return { label: `Baja el ${formatDayMonth(leavesOn)}`, tone: "pending" };
  return course.paymentStatus === "late" ? { label: "Atrasado", tone: "late" } : null;
};

type MembershipCourseListProps = {
  courses: CourseSchemaWithMember[];
  /** The scheduled change, if any. */
  change: MembershipChange | null;
  branchName: (branchId: string | null | undefined) => string | undefined;
};

/** "Tus cursos" on Mi membresía: each course, with whether it's paused, when it leaves or that it's late. */
const MembershipCourseList = ({ courses, change, branchName }: MembershipCourseListProps) => (
  <Card padded={false} className="mx-3 px-4">
    {courses.map((course, index) => {
      const where = [formatCourseSchedule(course.day, course.startTime, course.endTime), branchName(course.branchId)]
        .filter(Boolean)
        .join(" · ");
      const chip = courseChip(course, change);
      return (
        <View
          key={course.id}
          className={`flex-row items-center justify-between gap-2.5 py-3 ${
            index < courses.length - 1 ? "border-b border-line-soft" : ""
          }`}
        >
          <View className="flex-1">
            <AppText variant="bold" className="text-[15px]">
              {course.title}
            </AppText>
            {!!where && (
              <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                {where}
              </AppText>
            )}
          </View>
          {/* In a View: Chip is self-start, which would pin it to the top of the row. */}
          <View>{chip && <Chip label={chip.label} tone={chip.tone} />}</View>
        </View>
      );
    })}
  </Card>
);

export default MembershipCourseList;
