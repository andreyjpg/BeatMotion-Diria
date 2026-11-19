import CourseProgressSummary from "@/components/courses/CourseProgressSummary";
import { ProgressSwatch } from "@/components/courses/ProgressBlocks";
import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip, { statusTone, type ChipTone } from "@/components/ui/Chip";
import Notice from "@/components/ui/Notice";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatCourseSchedule, formatDayMonth, formatShortDate, standingLabel } from "@/constants/helpers";
import { useRefreshAttendance } from "@/hooks/attendance/useRefreshAttendance";
import { useBranches } from "@/hooks/branches/useBranches";
import { hasClassDates, type ProgressBlockState } from "@/hooks/courses/courseProgress";
import type { CourseSchemaWithMember } from "@/hooks/courses/schema/courseSchema";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import {
  activePauseOf,
  earliestPaymentDate,
  enrollmentBlockOf,
  leavingDateOf,
  nextChargedDate,
  pauseRangesOf,
  scheduledChangeOf,
} from "@/hooks/membership/membershipRules";
import { useMembershipChanges } from "@/hooks/membership/useMembershipChanges";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import { FlatList, RefreshControl, View } from "react-native";

const LEGEND: { state: ProgressBlockState; label: string }[] = [
  { state: "attended", label: "Asistió" },
  { state: "missed", label: "Faltó" },
  { state: "noClass", label: "Sin clase" },
  { state: "upcoming", label: "Por venir" },
];

/** Added to the legend once the student has paused: their classes during it. */
const PAUSED_LEGEND_ITEM = { state: "paused", label: "En pausa" } as const;

const LEGEND_SWATCH_SIZE = 10;

/** Why the student can't enroll now, over the list: a pause in progress or scheduled. */
const ENROLL_BLOCKED_TEXT: Record<string, string> = {
  MEMBERSHIP_PAUSED: "Termina tu pausa para matricular un curso.",
  PAUSE_SCHEDULED: "Tienes una pausa programada. Deshazla para matricular un curso.",
};

/** A course's status chip: "En pausa" while paused, otherwise its payment standing. */
const statusChipOf = (course: CourseSchemaWithMember): { label: string; tone: ChipTone } =>
  course.pausedUntil
    ? { label: "En pausa", tone: "muted" }
    : { label: standingLabel[course.paymentStatus] ?? course.paymentStatus, tone: statusTone(course.paymentStatus) };

/** What the blocks of the course cards mean (the bars describe themselves to screen readers). */
const ProgressLegend = ({ hasPaused }: { hasPaused: boolean }) => (
  <View className="flex-row flex-wrap gap-3 px-2" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {(hasPaused ? [...LEGEND, PAUSED_LEGEND_ITEM] : LEGEND).map((item) => (
      <View key={item.state} className="flex-row items-center gap-1.5">
        <ProgressSwatch state={item.state} size={LEGEND_SWATCH_SIZE} />
        <AppText variant="label" tone="muted" className="text-[9.5px]">
          {item.label}
        </AppText>
      </View>
    ))}
  </View>
);

/** Student "Cursos" tab: the courses they're enrolled in, with their progress. */
const MyCourses = () => {
  const router = useRouter();
  const { user: activeUser } = useActiveUser();
  const userId = activeUser?.uid ?? "";
  const myCoursesQuery = useCoursesByUserMember(userId);
  const changesQuery = useMembershipChanges(userId);
  const branchesQuery = useBranches();
  const refreshAttendance = useRefreshAttendance();

  const courses = myCoursesQuery.data ?? [];
  const change = scheduledChangeOf(changesQuery.data);
  const activePause = activePauseOf(changesQuery.data);
  const hasPaused = pauseRangesOf(changesQuery.data).length > 0;
  const enrollBlockedText = ENROLL_BLOCKED_TEXT[enrollmentBlockOf(changesQuery.data) ?? ""] ?? null;
  // A scheduled pause from the due date on doesn't charge it: the next payment is its end.
  const nextPayment = nextChargedDate(earliestPaymentDate(courses), change);
  const coursesText = courses.length === 1 ? "1 curso" : `${courses.length} cursos`;
  const paymentText = nextPayment ? ` · próximo pago ${formatShortDate(nextPayment).toLowerCase()}` : "";
  const subtitle =
    courses.length === 0
      ? undefined
      : activePause?.endDate
        ? `En pausa hasta el ${formatDayMonth(activePause.endDate)}`
        : `${coursesText}${paymentText}`;

  const handleClickCourse = (courseId: string) => {
    router.push({ pathname: "/private/user/course/[courseId]", params: { courseId } });
  };

  return (
    <Screen scroll={false} inTabs>
      <ScreenHeader
        nav={false}
        title="Mis cursos"
        subtitle={subtitle}
        right={
          enrollBlockedText ? undefined : (
            <Button
              label="Matricular"
              icon="add"
              size="sm"
              onPress={() => router.push("/private/user/enrollment/createEnrollment")}
            />
          )
        }
      />
      {enrollBlockedText && (
        <Notice
          tone="neutral"
          className="mx-3 mt-3.5"
          action={
            <Button
              label="Mi membresía"
              variant="secondary"
              size="sm"
              className="self-start"
              onPress={() => router.push("/private/user/membership")}
            />
          }
        >
          {enrollBlockedText}
        </Notice>
      )}
      <DataLoader query={myCoursesQuery} emptyMessage="Todavía no estás en ningún curso.">
        {(data, isRefetching, refetch) => (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerClassName="gap-2.5 px-3 pb-8 pt-5"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => {
                  refetch();
                  changesQuery.refetch();
                  // Each card's progress loads its own attendance.
                  refreshAttendance();
                }}
              />
            }
            ListHeaderComponent={data.some(hasClassDates) ? <ProgressLegend hasPaused={hasPaused} /> : undefined}
            renderItem={({ item: course }) => {
              const branch = branchesQuery.data?.find((b) => b.id === course.branchId);
              const when = [formatCourseSchedule(course.day, course.startTime, course.endTime), branch?.name]
                .filter(Boolean)
                .join(" · ");
              // Until then the student keeps attending; on that day the course leaves this list.
              const leavesOn = leavingDateOf(course.courseId, change);
              const leavingLabel = leavesOn ? `Baja el ${formatDayMonth(leavesOn)}` : null;
              const statusChip = statusChipOf(course);
              return (
                <Card
                  onPress={() => handleClickCourse(course.courseId)}
                  accessibilityLabel={[
                    course.pausedUntil ? `${course.title}, en pausa` : `${course.title}, pago ${standingLabel[course.paymentStatus] ?? ""}`,
                    leavingLabel,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  className="gap-2.5"
                >
                  <View className="flex-row items-start justify-between gap-2.5">
                    <AppText variant="bold" className="flex-1 text-[18px] leading-[22px]">
                      {course.title}
                    </AppText>
                    {/* Each chip in its own View: Chip is self-start, which would pull it left. */}
                    <View className="items-end gap-1">
                      <View>
                        <Chip label={statusChip.label} tone={statusChip.tone} />
                      </View>
                      {leavingLabel && (
                        <View>
                          <Chip label={leavingLabel} tone="pending" />
                        </View>
                      )}
                    </View>
                  </View>
                  {!!when && (
                    <AppText tone="muted" className="text-[14px]" numberOfLines={1}>
                      {when}
                    </AppText>
                  )}
                  <CourseProgressSummary userId={userId} course={course} />
                </Card>
              );
            }}
          />
        )}
      </DataLoader>
    </Screen>
  );
};

export default MyCourses;
