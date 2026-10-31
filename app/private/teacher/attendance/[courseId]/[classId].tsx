import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatShortDate, formatYYYYMMDD, hhmmTo12h, parseLocalDate } from "@/constants/helpers";
import type { RsvpStatus } from "@/hooks/attendance/schema";
import { useAttendanceByClass } from "@/hooks/attendance/useAttendanceByClass";
import { useUpsertAttendance } from "@/hooks/attendance/useUpsertAttendance";
import { useGetClassInfo } from "@/hooks/classes/useGetClassInfo";
import { useMembersByCourse } from "@/hooks/courseMember/useMembersByCourse";
import { useCourseById } from "@/hooks/courses/useCourseById";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";

type AttendanceParams = {
  classId: string;
  courseId: string;
};

type StudentMark = {
  attended: boolean;
  rsvpStatus: RsvpStatus | null;
};

const CHOICES: { value: RsvpStatus; short: string; label: string }[] = [
  { value: "leaders", short: "L", label: "Líder" },
  { value: "followers", short: "S", label: "Seguidor" },
  { value: "no_asistira", short: "✕", label: "No asiste" },
];

const RESPONSE: Record<RsvpStatus, string> = {
  leaders: "Respondió líder",
  followers: "Respondió seguidor",
  no_asistira: "No asistirá",
};

const NO_MARK: StudentMark = { attended: false, rsvpStatus: null };

/** Attendance sheet of a class: L or S marks the student present in that role, ✕ absent. */
const Attendance = () => {
  const { classId, courseId } = useLocalSearchParams<AttendanceParams>();
  const { user } = useActiveUser();
  const courseQuery = useCourseById(courseId);
  const classQuery = useGetClassInfo(classId);
  const membersQuery = useMembersByCourse(courseId);
  const attendanceQuery = useAttendanceByClass(classId);
  const saveAttendance = useUpsertAttendance();

  // Only the students the teacher changed; everyone else shows what's saved.
  const [edits, setEdits] = useState<Record<string, StudentMark>>({});

  const course = courseQuery.data;
  const cls = classQuery.data;
  const isMine = !!course && (user?.role === "admin" || course.teacherId === user?.uid);
  // Someone is already marked present: attendance was taken before.
  const taken = attendanceQuery.data?.some((row) => row.attended) ?? false;

  const savedMark = (userId: string): StudentMark => {
    const row = attendanceQuery.data?.find((r) => r.userId === userId);
    return row ? { attended: row.attended, rsvpStatus: row.rsvpStatus } : NO_MARK;
  };

  // The first time, students who said they're coming start marked present in
  // that role: the teacher only changes who didn't show up or didn't answer.
  const markFor = (userId: string): StudentMark => {
    if (edits[userId]) return edits[userId];
    const saved = savedMark(userId);
    const saidYes = saved.rsvpStatus === "leaders" || saved.rsvpStatus === "followers";
    return !taken && saidYes ? { ...saved, attended: true } : saved;
  };

  const choose = (userId: string, rsvpStatus: RsvpStatus) =>
    setEdits((prev) => ({ ...prev, [userId]: { attended: rsvpStatus !== "no_asistira", rsvpStatus } }));

  const members = membersQuery.data ?? [];
  const marks = members.map((m) => ({ userId: m.userId, ...markFor(m.userId) }));
  // Rows that differ from what's saved (the teacher's changes and the students
  // marked present from their answer). Saving just these keeps RSVPs that
  // other students sent meanwhile.
  const changes = marks.filter((mark) => {
    const saved = savedMark(mark.userId);
    return mark.attended !== saved.attended || mark.rsvpStatus !== saved.rsvpStatus;
  });
  const count = (status: RsvpStatus) => marks.filter((m) => m.rsvpStatus === status).length;
  const present = marks.filter((m) => m.attended).length;

  const handleSave = async () => {
    try {
      await saveAttendance.mutateAsync({ classId, rows: changes });
      setEdits({});
    } catch {
      // useUpsertAttendance already showed the error; the edits stay to retry.
    }
  };

  const date = parseLocalDate(cls?.date ?? null);
  const isToday = cls?.date === formatYYYYMMDD(new Date());
  const eyebrow = `Asistencia${isToday ? " · hoy" : date ? ` · ${formatShortDate(date).toLowerCase()}` : ""}`;
  const subtitle = [cls?.title, hhmmTo12h(cls?.startTime), !taken && "ya marcamos lo que respondió cada estudiante"]
    .filter(Boolean)
    .join(" · ");

  return (
    <Screen
      footer={
        isMine ? (
          <Button
            label={`Guardar asistencia · ${present} ${present === 1 ? "presente" : "presentes"}`}
            onPress={handleSave}
            loading={saveAttendance.isPending}
            disabled={changes.length === 0}
          />
        ) : undefined
      }
      refreshControl={
        <RefreshControl
          refreshing={membersQuery.isRefetching}
          onRefresh={() => {
            membersQuery.refetch();
            attendanceQuery.refetch();
          }}
        />
      }
    >
      <ScreenHeader eyebrow={eyebrow} title={course?.title ?? "Asistencia"} subtitle={isMine ? subtitle : undefined} />
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
                  { value: count("leaders"), label: "Líderes" },
                  { value: count("followers"), label: "Seguidores" },
                  { value: count("no_asistira"), label: "No asisten" },
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
              <AppText variant="label" tone="muted" className="px-6 pt-3 text-right text-[10px]">
                L = líder · S = seguidor · ✕ = no asiste
              </AppText>

              <DataLoader query={membersQuery} emptyMessage="No hay estudiantes en este curso.">
                {(students) => (
                  <Card padded={false} className="mx-3 mt-2 py-1">
                    {students.map((student, i) => {
                      const mark = markFor(student.userId);
                      const saved = savedMark(student.userId);
                      const name = student.userInfo.fullName;
                      return (
                        <View
                          key={student.id}
                          className={`flex-row items-center gap-2.5 py-2 pl-3.5 pr-2.5 ${
                            i < students.length - 1 ? "border-b border-line-soft" : ""
                          }`}
                        >
                          <Avatar
                            name={student.userInfo.name}
                            lastName={student.userInfo.lastName}
                            photoUrl={student.userInfo.photoURL}
                            size={36}
                          />
                          <View className="flex-1">
                            <AppText variant="bold" className="text-[14.5px]" numberOfLines={1}>
                              {name}
                            </AppText>
                            <AppText tone="muted" className="text-[12px]" numberOfLines={1}>
                              {saved.attended
                                ? "Presente"
                                : saved.rsvpStatus
                                  ? RESPONSE[saved.rsvpStatus]
                                  : "Sin respuesta"}
                            </AppText>
                          </View>
                          <View
                            accessibilityRole="radiogroup"
                            accessibilityLabel={`Asistencia de ${name}`}
                            className="flex-row gap-[3px] rounded-[10px] bg-control-track p-[3px]"
                          >
                            {CHOICES.map((choice) => {
                              const on = mark.rsvpStatus === choice.value;
                              const isNo = choice.value === "no_asistira";
                              return (
                                <Pressable
                                  key={choice.value}
                                  onPress={() => choose(student.userId, choice.value)}
                                  accessibilityRole="radio"
                                  aria-checked={on}
                                  accessibilityLabel={choice.label}
                                  className={`h-9 w-11 items-center justify-center rounded-lg ${
                                    on ? (isNo ? "border-[1.5px] border-danger bg-surface" : "bg-ink") : ""
                                  }`}
                                >
                                  <AppText
                                    variant="bold"
                                    tone={on ? (isNo ? "danger" : "inverse") : "neutral"}
                                    className="text-[13px]"
                                  >
                                    {choice.short}
                                  </AppText>
                                </Pressable>
                              );
                            })}
                          </View>
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
};

export default Attendance;
