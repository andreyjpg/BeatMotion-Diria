import BirthdaysMock from "@/components/mocks/BirthdaysMock";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import HomeHero from "@/components/ui/HomeHero";
import Screen from "@/components/ui/Screen";
import SectionHeader from "@/components/ui/SectionHeader";
import { SHOW_FEATURE_MOCKS } from "@/constants/featureMocks";
import {
  capitalize,
  formatShortDate,
  formatYYYYMMDD,
  hhmmTo12h,
  parseLocalDate,
  to24h,
} from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useAttendanceByClass } from "@/hooks/attendance/useAttendanceByClass";
import type { ClassesType } from "@/hooks/classes/classesSchema";
import { useActiveClasses } from "@/hooks/classes/useActiveClasses";
import { useCourses } from "@/hooks/courses/useCourses";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, View } from "react-native";

/** Teacher home: the next class with who's coming, today's classes and their courses. */
const HomeTeacher = () => {
  const router = useRouter();
  const { user } = useActiveUser();
  const coursesQuery = useCourses();
  const classesQuery = useActiveClasses();

  const today = new Date();
  const todayKey = formatYYYYMMDD(today);
  const nowHHMM = to24h(today);

  const myCourses = (coursesQuery.data ?? []).filter((course) => course.teacherId === user?.uid);
  const myCourseIds = new Set(myCourses.map((c) => c.id));
  const courseTitle = (courseId: string) => myCourses.find((c) => c.id === courseId)?.title ?? "";
  const myClasses = (classesQuery.data ?? []).filter((cls) => myCourseIds.has(cls.courseId) && cls.date);
  const todayClasses = myClasses
    .filter((cls) => cls.date === todayKey)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  // The class still to finish today; once they're all over, the last one.
  const heroClass =
    todayClasses.find((cls) => (cls.endTime ?? cls.startTime ?? "99:99") >= nowHHMM) ?? todayClasses.at(-1);
  const nextClass = heroClass ? undefined : myClasses.find((cls) => (cls.date ?? "") > todayKey);

  const attendanceQuery = useAttendanceByClass(heroClass?.id ?? "");
  const rsvps = attendanceQuery.data ?? [];
  const count = (status: string) => rsvps.filter((row) => row.rsvpStatus === status).length;

  const openAttendance = (cls: ClassesType) =>
    router.push({
      pathname: "/private/teacher/attendance/[courseId]/[classId]",
      params: { courseId: cls.courseId, classId: cls.id },
    });
  const openCourse = (courseId: string) =>
    router.push({ pathname: "/private/teacher/course/[courseId]", params: { courseId } });

  const refresh = () => {
    coursesQuery.refetch();
    classesQuery.refetch();
    attendanceQuery.refetch();
  };

  return (
    <Screen
      inTabs
      refreshControl={<RefreshControl refreshing={classesQuery.isRefetching} onRefresh={refresh} />}
    >
      {heroClass ? (
        <HomeHero
          eyebrow={`${formatShortDate(today)} · Próxima clase`}
          title={`${courseTitle(heroClass.courseId)}${heroClass.startTime ? `\na las ${hhmmTo12h(heroClass.startTime)}` : ""}`}
        >
          <View className="mt-5 flex-row border-t border-hero-line pt-3">
            {[
              { n: count("leaders"), label: "Líderes" },
              { n: count("followers"), label: "Seguidores" },
              { n: count("no_asistira"), label: "No vienen", dim: true },
            ].map((s, i) => (
              <View key={s.label} className={`flex-1 ${i > 0 ? "border-l border-hero-line pl-3" : ""}`}>
                <AppText variant="heavy" tone={s.dim ? "hero-soft" : "inverse"} className="text-[24px]">
                  {s.n}
                </AppText>
                <AppText tone="hero-soft" className="text-[11.5px]">
                  {s.label}
                </AppText>
              </View>
            ))}
          </View>
          <Button label="Tomar asistencia" variant="inverse" className="mt-4" onPress={() => openAttendance(heroClass)} />
        </HomeHero>
      ) : (
        <HomeHero
          eyebrow={formatShortDate(today)}
          title="Hoy no tienes clases"
          subtitle={
            nextClass?.date
              ? `La próxima: ${courseTitle(nextClass.courseId)}, ${formatShortDate(
                  parseLocalDate(nextClass.date) ?? today,
                ).toLowerCase()}${nextClass.startTime ? ` a las ${hhmmTo12h(nextClass.startTime)}` : ""}.`
              : "No tienes clases programadas."
          }
        />
      )}

      {SHOW_FEATURE_MOCKS && <BirthdaysMock />}

      {todayClasses.length > 0 && (
        <>
          <SectionHeader
            title="Hoy"
            note={todayClasses.length === 1 ? "1 clase" : `${todayClasses.length} clases`}
          />
          <View className="gap-2 px-3">
            {todayClasses.map((cls) => {
              const isHero = cls.id === heroClass?.id;
              return (
                <Card
                  key={cls.id}
                  onPress={() => openAttendance(cls)}
                  accessibilityLabel={`${courseTitle(cls.courseId)}, tomar asistencia`}
                  className="flex-row items-center gap-3.5 px-3.5 py-3.5"
                >
                  <View
                    className={`h-[52px] w-[60px] items-center justify-center rounded-xl ${isHero ? "bg-ink" : "bg-ground"}`}
                  >
                    <AppText variant="heavy" tone={isHero ? "inverse" : "ink"} className="text-[13.5px]">
                      {hhmmTo12h(cls.startTime) || "—"}
                    </AppText>
                  </View>
                  <View className="flex-1">
                    <AppText variant="bold" className="text-[15.5px]" numberOfLines={1}>
                      {courseTitle(cls.courseId)}
                    </AppText>
                    <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                      {cls.title ?? "Clase"}
                    </AppText>
                  </View>
                  <AppText variant="semibold" className="text-[13px] underline">
                    Asistencia
                  </AppText>
                </Card>
              );
            })}
          </View>
        </>
      )}

      <SectionHeader title="Mis cursos" />
      <View className="flex-row flex-wrap justify-between gap-y-2 px-3">
        {myCourses.length === 0 && (
          <AppText tone="muted" className="px-2 text-[14px]">
            Todavía no tienes cursos asignados.
          </AppText>
        )}
        {myCourses.map((course) => (
          <Pressable
            key={course.id}
            onPress={() => openCourse(course.id)}
            accessibilityRole="button"
            accessibilityLabel={course.title}
            className="gap-1 rounded-[18px] bg-surface p-4 active:opacity-80"
            style={{ width: "49%" }}
          >
            <AppText variant="bold" className="text-[15px]" numberOfLines={2}>
              {course.title}
            </AppText>
            <View className="flex-row items-center gap-1">
              <Ionicons name="calendar-outline" size={13} color={palette.muted} />
              <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                {[course.day && capitalize(course.day), `Nivel ${course.level}`].filter(Boolean).join(" · ")}
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
};

export default HomeTeacher;
