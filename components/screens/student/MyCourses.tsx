import CourseProgressSummary from "@/components/courses/CourseProgressSummary";
import { ProgressSwatch } from "@/components/courses/ProgressBlocks";
import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip, { statusTone } from "@/components/ui/Chip";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatCourseSchedule, formatShortDate, standingLabel } from "@/constants/helpers";
import { useRefreshAttendance } from "@/hooks/attendance/useRefreshAttendance";
import { useBranches } from "@/hooks/branches/useBranches";
import { hasClassDates, type ProgressBlockState } from "@/hooks/courses/courseProgress";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import { FlatList, RefreshControl, View } from "react-native";

const LEGEND: { state: ProgressBlockState; label: string }[] = [
  { state: "attended", label: "Asistió" },
  { state: "missed", label: "Faltó" },
  { state: "noClass", label: "Sin clase" },
  { state: "upcoming", label: "Por venir" },
];

const LEGEND_SWATCH_SIZE = 10;

/** What the blocks of the course cards mean (the bars describe themselves to screen readers). */
const ProgressLegend = () => (
  <View className="flex-row flex-wrap gap-3 px-2" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {LEGEND.map((item) => (
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
  const branchesQuery = useBranches();
  const refreshAttendance = useRefreshAttendance();

  const courses = myCoursesQuery.data ?? [];
  const nextPayment = courses
    .map((course) => course.nextPaymentDate)
    .filter((date): date is Date => date instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const subtitle =
    courses.length === 0
      ? undefined
      : `${courses.length === 1 ? "1 curso" : `${courses.length} cursos`}${
          nextPayment ? ` · próximo pago ${formatShortDate(nextPayment).toLowerCase()}` : ""
        }`;

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
          <Button
            label="Matricular"
            icon="add"
            size="sm"
            onPress={() => router.push("/private/user/enrollment/createEnrollment")}
          />
        }
      />
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
                  // Each card's progress loads its own attendance.
                  refreshAttendance();
                }}
              />
            }
            ListHeaderComponent={data.some(hasClassDates) ? <ProgressLegend /> : undefined}
            renderItem={({ item: course }) => {
              const branch = branchesQuery.data?.find((b) => b.id === course.branchId);
              const when = [formatCourseSchedule(course.day, course.startTime, course.endTime), branch?.name]
                .filter(Boolean)
                .join(" · ");
              return (
                <Card
                  onPress={() => handleClickCourse(course.courseId)}
                  accessibilityLabel={`${course.title}, pago ${standingLabel[course.paymentStatus] ?? ""}`}
                  className="gap-2.5"
                >
                  <View className="flex-row items-start justify-between gap-2.5">
                    <AppText variant="bold" className="flex-1 text-[18px] leading-[22px]">
                      {course.title}
                    </AppText>
                    <Chip
                      label={standingLabel[course.paymentStatus] ?? course.paymentStatus}
                      tone={statusTone(course.paymentStatus)}
                    />
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
