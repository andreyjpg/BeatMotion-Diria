import DataLoader from "@/components/DataLoader";
import CourseProgressMock from "@/components/mocks/CourseProgressMock";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip, { statusTone } from "@/components/ui/Chip";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { SHOW_FEATURE_MOCKS } from "@/constants/featureMocks";
import { capitalize, formatShortDate, standingLabel } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FlatList, RefreshControl, View } from "react-native";

/** Student "Cursos" tab: the courses they're enrolled in. */
const MyCourses = () => {
  const router = useRouter();
  const { user: activeUser } = useActiveUser();
  const myCoursesQuery = useCoursesByUserMember(activeUser?.uid || "");
  const branchesQuery = useBranches();

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
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            renderItem={({ item: course }) => {
              const branch = branchesQuery.data?.find((b) => b.id === course.branchId);
              const meta = [`Nivel ${course.level}`, course.startDate && `Inicia ${formatShortDate(course.startDate).toLowerCase()}`]
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
                  <View className="gap-1.5">
                    {course.day && (
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="calendar-outline" size={16} color={palette.muted} />
                        <AppText className="text-[14px]">{capitalize(course.day)}</AppText>
                      </View>
                    )}
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="location-outline" size={16} color={palette.muted} />
                      <AppText tone="muted" className="flex-1 text-[14px]" numberOfLines={1}>
                        {[branch?.name, course.teacher].filter(Boolean).join(" · ")}
                      </AppText>
                    </View>
                  </View>
                  {SHOW_FEATURE_MOCKS && <CourseProgressMock />}
                  <View className="flex-row items-center justify-between border-t border-line-soft pt-2.5">
                    <AppText variant="label" tone="muted" className="text-[10.5px]">
                      {meta}
                    </AppText>
                    <Ionicons name="chevron-forward" size={18} color={palette.ink} />
                  </View>
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
