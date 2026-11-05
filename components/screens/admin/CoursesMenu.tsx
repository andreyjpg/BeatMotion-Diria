import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { capitalize, formatDayMonth, shortDayName } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useBranches } from "@/hooks/branches/useBranches";
import { useActiveClasses } from "@/hooks/classes/useActiveClasses";
import { CourseType } from "@/hooks/courses/schema/courseSchema";
import { useCourses } from "@/hooks/courses/useCourses";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, View } from "react-native";

/** Admin "Cursos" tab: every course by branch, and the way in to create and edit them. */
const CoursesMenuScreen = () => {
  const router = useRouter();
  const coursesQuery = useCourses();
  const classesQuery = useActiveClasses();
  const branchesQuery = useBranches();

  const courses = coursesQuery.data ?? [];
  const branches = branchesQuery.data ?? [];

  // Each branch with courses, in the branches' order; then the courses without one.
  const groups: { key: string; name: string; courses: CourseType[] }[] = branches
    .map((branch) => ({
      key: branch.id,
      name: branch.name,
      courses: courses.filter((course) => course.branchId === branch.id),
    }))
    .filter((group) => group.courses.length > 0);
  const withoutBranch = courses.filter((course) => !branches.some((b) => b.id === course.branchId));
  if (withoutBranch.length > 0) groups.push({ key: "none", name: "Sin sede", courses: withoutBranch });

  const classCount = (courseId: string) =>
    (classesQuery.data ?? []).filter((cls) => cls.courseId === courseId).length;
  const branchCount = groups.filter((group) => group.key !== "none").length;

  const refresh = () => {
    coursesQuery.refetch();
    classesQuery.refetch();
    branchesQuery.refetch();
  };

  return (
    <Screen
      inTabs
      refreshControl={<RefreshControl refreshing={coursesQuery.isRefetching} onRefresh={refresh} />}
    >
      <ScreenHeader
        nav={false}
        title="Cursos"
        subtitle={
          coursesQuery.data
            ? `${courses.length} ${courses.length === 1 ? "curso" : "cursos"} en ${branchCount} ${branchCount === 1 ? "sede" : "sedes"}`
            : undefined
        }
        right={
          <Pressable
            onPress={() => router.push("/private/admin/branches")}
            accessibilityRole="link"
            hitSlop={8}
          >
            <AppText variant="semibold" className="text-[13.5px] underline">
              Sedes
            </AppText>
          </Pressable>
        }
      />

      <View className="flex-row gap-2.5 px-3 pt-4">
        <Button
          label="Nuevo curso"
          icon="add"
          onPress={() => router.push("/private/admin/courses/new")}
          className="flex-1"
        />
        <Button
          label="Nueva clase"
          icon="add"
          variant="secondary"
          onPress={() => router.push("/private/admin/classes/new")}
          className="flex-1"
        />
      </View>

      <DataLoader query={coursesQuery} emptyMessage="No hay cursos creados aún.">
        {() =>
          groups.map((group) => (
            <View key={group.key}>
              <SectionHeader
                title={group.name}
                note={group.courses.length === 1 ? "1 curso" : `${group.courses.length} cursos`}
              />
              <Card padded={false} className="mx-3 py-1">
                {group.courses.map((course, i) => {
                  const classes = classCount(course.id);
                  return (
                    <Pressable
                      key={course.id}
                      onPress={() => router.push({ pathname: "/private/admin/courses/[id]", params: { id: course.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={course.title}
                      className={`flex-row items-center gap-3 px-3.5 py-3 active:opacity-70 ${
                        i < group.courses.length - 1 ? "border-b border-line-soft" : ""
                      }`}
                    >
                      <View className="h-[50px] w-[46px] items-center justify-center rounded-xl bg-ink">
                        <AppText variant="label-bold" tone="inverse" className="text-[11px]">
                          {shortDayName(course.day) || "—"}
                        </AppText>
                      </View>
                      <View className="flex-1 gap-1">
                        <AppText variant="bold" className="text-[15.5px]" numberOfLines={1}>
                          {course.title}
                        </AppText>
                        <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                          {[course.day && capitalize(course.day), course.teacher].filter(Boolean).join(" · ")}
                        </AppText>
                        <View className="flex-row flex-wrap gap-[5px]">
                          <Chip label={classes === 1 ? "1 clase" : `${classes} clases`} />
                          <Chip
                            label={course.startDate ? `Inicia ${formatDayMonth(course.startDate)}` : "Sin fechas"}
                          />
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={palette.ink} />
                    </Pressable>
                  );
                })}
              </Card>
            </View>
          ))
        }
      </DataLoader>
    </Screen>
  );
};

export default CoursesMenuScreen;
