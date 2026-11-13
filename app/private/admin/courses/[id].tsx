import AssignStudentModal from "@/components/AssignStudentModal";
import ClassRow from "@/components/courses/ClassRow";
import CourseAges from "@/components/courses/CourseAges";
import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip, { statusTone } from "@/components/ui/Chip";
import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import {
  ageOrNoAge,
  attendanceRate,
  classWhen,
  formatCourseSchedule,
  formatDayMonth,
  formatYYYYMMDD,
  standingLabel,
} from "@/constants/helpers";
import { useAttendanceByCourse } from "@/hooks/attendance/useAttendanceByCourse";
import { useBranchById } from "@/hooks/branches/useBranchById";
import { useClassesByCourseId } from "@/hooks/classes/useClassesByCourseId";
import { toCourseAges } from "@/hooks/courseMember/schema";
import { useMembersByCourse } from "@/hooks/courseMember/useMembersByCourse";
import { useCourseById } from "@/hooks/courses/useCourseById";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";

type CourseView = "classes" | "students";

const SEGMENTS: { value: CourseView; label: string }[] = [
  { value: "classes", label: "Clases" },
  { value: "students", label: "Estudiantes" },
];

/** Admin: one course with its numbers, classes and students. */
const AdminCourseScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseQuery = useCourseById(id);
  const classesQuery = useClassesByCourseId(id);
  const membersQuery = useMembersByCourse(id);
  const attendanceQuery = useAttendanceByCourse(id);
  const branchQuery = useBranchById(courseQuery.data?.branchId ?? "");
  const [view, setView] = useState<CourseView>("classes");
  const [assigning, setAssigning] = useState(false);

  const found = courseQuery.data?.isDeleted ? null : courseQuery.data;
  const today = formatYYYYMMDD(new Date());
  const members = membersQuery.data;
  const rate = attendanceRate(attendanceQuery.data, new Set((members ?? []).map((m) => m.userId)));

  const refresh = () => {
    courseQuery.refetch();
    classesQuery.refetch();
    membersQuery.refetch();
    attendanceQuery.refetch();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={courseQuery.isRefetching} onRefresh={refresh} />}>
      <ScreenHeader
        eyebrow={found ? `Curso · Nivel ${found.level}` : "Curso"}
        title={found?.title ?? "Curso"}
        subtitle={
          found
            ? [formatCourseSchedule(found.day, found.startTime, found.endTime), branchQuery.data?.name, found.teacher]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        right={
          found ? (
            <IconButton
              icon="create-outline"
              onPress={() => router.push({ pathname: "/private/admin/courses/edit/[id]", params: { id } })}
              accessibilityLabel="Editar curso"
            />
          ) : undefined
        }
      />
      <DataLoader query={{ ...courseQuery, data: found }} emptyMessage="No encontramos este curso.">
        {(course) => (
          <>
            {course.startDate && (
              <View className="px-5 pt-2.5">
                <Chip label={`Inicia ${formatDayMonth(course.startDate)}`} />
              </View>
            )}

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
            <CourseAges title="Edades en el curso" ages={members && toCourseAges(members)} chart="rows" />

            <SegmentedControl
              segments={SEGMENTS}
              value={view}
              onChange={setView}
              accessibilityLabel="Contenido del curso"
              className="mx-3 mt-4"
            />

            {view === "classes" ? (
              <>
                <DataLoader query={classesQuery} emptyMessage="Este curso todavía no tiene clases.">
                  {(classes) => (
                    <Card padded={false} className="mx-3 mt-2.5 py-1">
                      {classes.map((cls, i) => (
                        <ClassRow
                          key={cls.id}
                          number={i + 1}
                          title={cls.title || `Clase ${i + 1}`}
                          detail={classWhen(cls.date, cls.startTime)}
                          highlighted={cls.date === today}
                          divider={i < classes.length - 1}
                          onPress={() => router.push({ pathname: "/private/admin/classes/[id]", params: { id: cls.id } })}
                          right={
                            <IconButton
                              icon="clipboard-outline"
                              tone="outline"
                              size={40}
                              onPress={() =>
                                router.push({
                                  pathname: "/private/teacher/attendance/[courseId]/[classId]",
                                  params: { courseId: id, classId: cls.id },
                                })
                              }
                              accessibilityLabel={`Tomar asistencia de ${cls.title || `la clase ${i + 1}`}`}
                            />
                          }
                        />
                      ))}
                    </Card>
                  )}
                </DataLoader>
                <Button
                  label="Crear clase"
                  variant="secondary"
                  icon="add"
                  onPress={() => router.push({ pathname: "/private/admin/classes/new", params: { courseId: id } })}
                  className="mx-3 mt-2.5"
                />
              </>
            ) : (
              <>
                <DataLoader query={membersQuery} emptyMessage="Este curso todavía no tiene estudiantes.">
                  {(students) => (
                    <Card padded={false} className="mx-3 mt-2.5 py-1">
                      {students.map((member, i) => (
                        <Pressable
                          key={member.id}
                          onPress={() =>
                            router.push({ pathname: "/private/admin/user/[uid]", params: { uid: member.userId } })
                          }
                          accessibilityRole="button"
                          className={`flex-row items-center gap-3 px-3.5 py-2.5 active:opacity-70 ${
                            i < students.length - 1 ? "border-b border-line-soft" : ""
                          }`}
                        >
                          <Avatar name={member.userInfo.name} lastName={member.userInfo.lastName} photoUrl={member.userInfo.photoURL} size={36} />
                          <View className="flex-1">
                            <AppText variant="bold" className="text-[15px]" numberOfLines={1}>
                              {`${member.userInfo.name} ${member.userInfo.lastName}`}
                            </AppText>
                            <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                              {ageOrNoAge(member.userInfo.birthDate)}
                            </AppText>
                          </View>
                          <View>
                            <Chip
                              label={standingLabel[member.paymentStatus] ?? member.paymentStatus}
                              tone={statusTone(member.paymentStatus)}
                            />
                          </View>
                        </Pressable>
                      ))}
                    </Card>
                  )}
                </DataLoader>
                <Button
                  label="Asignar estudiante"
                  variant="secondary"
                  icon="add"
                  onPress={() => setAssigning(true)}
                  className="mx-3 mt-2.5"
                />
              </>
            )}

            <AssignStudentModal
              visible={assigning}
              courseId={id}
              courseName={course.title}
              onClose={() => setAssigning(false)}
            />
          </>
        )}
      </DataLoader>
    </Screen>
  );
};

export default AdminCourseScreen;
