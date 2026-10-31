import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { capitalize, formatShortDate, formatYYYYMMDD, hhmmTo12h, parseLocalDate } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useAttendanceByCourse } from "@/hooks/attendance/useAttendanceByCourse";
import { useBranchById } from "@/hooks/branches/useBranchById";
import type { ClassesType } from "@/hooks/classes/classesSchema";
import { useClassesByCourseId } from "@/hooks/classes/useClassesByCourseId";
import { useMembersByCourse } from "@/hooks/courseMember/useMembersByCourse";
import { useCourseById } from "@/hooks/courses/useCourseById";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, RefreshControl, View } from "react-native";

/**
 * A teacher's course: its numbers and its classes. Read only: teachers open
 * a class and take attendance; creating or editing is for admins.
 */
export default function TeacherCourseScreen() {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { user } = useActiveUser();
  const courseQuery = useCourseById(courseId);
  const classesQuery = useClassesByCourseId(courseId);
  const membersQuery = useMembersByCourse(courseId);
  const attendanceQuery = useAttendanceByCourse(courseId);
  const branchQuery = useBranchById(courseQuery.data?.branchId ?? "");

  const course = courseQuery.data;
  // Teachers only see the courses assigned to them.
  const isMine = !!course && !course.isDeleted && (user?.role === "admin" || course.teacherId === user?.uid);

  const today = formatYYYYMMDD(new Date());
  const members = membersQuery.data;
  const memberIds = new Set((members ?? []).map((m) => m.userId));
  const attendedByClass = new Map<string, number>();
  for (const row of attendanceQuery.data ?? []) {
    if (row.attended) attendedByClass.set(row.classId, (attendedByClass.get(row.classId) ?? 0) + 1);
  }
  // Over the classes where attendance was taken: present marks of current
  // students / (students × those classes).
  const presentMarks = (attendanceQuery.data ?? []).filter((r) => r.attended && memberIds.has(r.userId)).length;
  const possibleMarks = memberIds.size * attendedByClass.size;
  const rate = possibleMarks > 0 ? `${Math.min(100, Math.round((presentMarks / possibleMarks) * 100))}%` : "—";

  const subtitle = course
    ? [
        course.day && capitalize(course.day),
        branchQuery.data?.name,
        `Nivel ${course.level}`,
        course.startDate && `Inicia ${formatShortDate(course.startDate).toLowerCase()}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  const openClass = (cls: ClassesType) =>
    router.push({ pathname: "/private/teacher/class/[classId]", params: { classId: cls.id } });
  const openAttendance = (cls: ClassesType) =>
    router.push({
      pathname: "/private/teacher/attendance/[courseId]/[classId]",
      params: { courseId: cls.courseId, classId: cls.id },
    });

  const refresh = () => {
    courseQuery.refetch();
    classesQuery.refetch();
    membersQuery.refetch();
    attendanceQuery.refetch();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={classesQuery.isRefetching} onRefresh={refresh} />}>
      <ScreenHeader eyebrow="Mi curso" title={course?.title ?? "Curso"} subtitle={isMine ? subtitle : undefined} />
      <DataLoader query={courseQuery} emptyMessage="No encontramos este curso.">
        {() =>
          !isMine ? (
            <AppText tone="faint" className="px-5 pt-8 text-center text-[14.5px]">
              Este curso no está asignado a ti.
            </AppText>
          ) : (
            <>
              <View className="flex-row gap-2 px-3 pt-4">
                {[
                  { value: members ? String(members.length) : "—", label: "Estudiantes" },
                  { value: classesQuery.data ? String(classesQuery.data.length) : "—", label: "Clases" },
                  { value: rate, label: "Asistencia" },
                ].map((stat) => (
                  <Card key={stat.label} padded={false} className="flex-1 px-3.5 py-3">
                    <AppText variant="heavy" className="text-[26px]">
                      {stat.value}
                    </AppText>
                    <AppText tone="muted" className="text-[12px]">
                      {stat.label}
                    </AppText>
                  </Card>
                ))}
              </View>
              {/* TODO(edades): the design's "Edades del grupo" bar needs the students'
                  birthdate, which the database doesn't store yet (this branch is UI only). */}

              <SectionHeader
                title="Clases"
                note={classesQuery.data?.length === 1 ? "1 clase" : `${classesQuery.data?.length ?? 0} clases`}
              />
              <DataLoader query={classesQuery} emptyMessage="Este curso todavía no tiene clases.">
                {(classes) => (
                  <Card padded={false} className="mx-3 py-1">
                    {classes.map((cls, i) => {
                      const isToday = cls.date === today;
                      const isPast = !!cls.date && cls.date < today;
                      const date = parseLocalDate(cls.date);
                      const when = [isToday ? "Hoy" : date ? formatShortDate(date) : "Sin fecha", hhmmTo12h(cls.startTime)]
                        .filter(Boolean)
                        .join(" · ");
                      const attended = attendedByClass.get(cls.id);
                      const title = cls.title || `Clase ${i + 1}`;
                      return (
                        <View
                          key={cls.id}
                          className={`flex-row items-center gap-3 py-2.5 pl-3.5 pr-3 ${
                            i < classes.length - 1 ? "border-b border-line-soft" : ""
                          }`}
                        >
                          <Pressable
                            onPress={() => openClass(cls)}
                            accessibilityRole="button"
                            accessibilityLabel={`${title}, ${when}`}
                            className="flex-1 flex-row items-center gap-3 active:opacity-70"
                          >
                            <View
                              className={`h-9 w-9 items-center justify-center rounded-[10px] ${isToday ? "bg-ink" : "bg-ground"}`}
                            >
                              <AppText variant="label-bold" tone={isToday ? "inverse" : "ink"} className="text-[12px]">
                                {String(i + 1).padStart(2, "0")}
                              </AppText>
                            </View>
                            <View className="flex-1">
                              <AppText variant="bold" className="text-[15px]" numberOfLines={1}>
                                {title}
                              </AppText>
                              <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                                {isPast && attended ? `${when} · ${attended} asistieron` : when}
                              </AppText>
                            </View>
                          </Pressable>
                          {isToday ? (
                            <Button label="Asistencia" size="sm" onPress={() => openAttendance(cls)} />
                          ) : isPast ? (
                            <Chip label="Hecha" tone="muted" />
                          ) : (
                            <Ionicons name="chevron-forward" size={18} color={palette.faint} />
                          )}
                        </View>
                      );
                    })}
                  </Card>
                )}
              </DataLoader>
            </>
          )
        }
      </DataLoader>
    </Screen>
  );
}
