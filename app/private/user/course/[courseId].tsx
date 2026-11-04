import ClassRow from "@/components/courses/ClassRow";
import DataLoader from "@/components/DataLoader";
import CourseProgressCardMock from "@/components/mocks/CourseProgressCardMock";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip, { statusTone, type ChipTone } from "@/components/ui/Chip";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { SHOW_FEATURE_MOCKS } from "@/constants/featureMocks";
import {
  capitalize,
  classWhen,
  formatDayMonth,
  formatShortDate,
  formatYYYYMMDD,
  standingLabel,
} from "@/constants/helpers";
import { useAttendanceByUser } from "@/hooks/attendance/useAttendanceByUser";
import { useBranchById } from "@/hooks/branches/useBranchById";
import { useClassesByCourseId } from "@/hooks/classes/useClassesByCourseId";
import { useCourseDetail } from "@/hooks/courses/useCourseDetail";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, RefreshControl, View } from "react-native";

/** One fact of the course's summary (schedule, branch…). */
const Fact = ({ label, value, className = "" }: { label: string; value: string; className?: string }) => (
  <View className={`flex-1 gap-1 px-3.5 py-3 ${className}`}>
    <AppText variant="label" tone="muted" className="text-[10px]">
      {label}
    </AppText>
    <AppText variant="bold" className="text-[15px]" numberOfLines={2}>
      {value}
    </AppText>
  </View>
);

/** A course the student is enrolled in: its details, their standing and its classes. */
const CourseDetail = () => {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { user: activeUser } = useActiveUser();
  const classesQuery = useClassesByCourseId(courseId);
  const attendanceQuery = useAttendanceByUser(activeUser?.uid ?? "", courseId);
  const courseDetailQuery = useCourseDetail(activeUser?.uid || "", courseId);
  const branchQuery = useBranchById(courseDetailQuery.data?.branchId || "");

  const course = courseDetailQuery.data;
  const classes = classesQuery.data ?? [];
  const today = formatYYYYMMDD(new Date());
  const attendedIds = new Set((attendanceQuery.data ?? []).filter((row) => row.attended).map((row) => row.classId));
  const attendedCount = classes.filter((cls) => attendedIds.has(cls.id)).length;
  const attendedPercent = classes.length > 0 ? (attendedCount / classes.length) * 100 : 0;
  const nextClassId = classes.find((cls) => (cls.date ?? "") > today)?.id;

  // Only present marks are stored reliably: a past class without one may also
  // be a class where attendance wasn't taken, so it doesn't say "absent".
  const classChip = (cls: (typeof classes)[number]): { label: string; tone: ChipTone } | null => {
    if (cls.date === today) return { label: "Hoy", tone: "ok" };
    if (attendedIds.has(cls.id)) return { label: "Asististe", tone: "muted" };
    if (cls.date && cls.date < today) return { label: "Sin registro", tone: "line" };
    if (cls.id === nextClassId) return { label: "Próxima", tone: "line" };
    return cls.date ? { label: "Pendiente", tone: "line" } : null;
  };

  const refresh = () => {
    courseDetailQuery.refetch();
    classesQuery.refetch();
    attendanceQuery.refetch();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={courseDetailQuery.isRefetching} onRefresh={refresh} />}>
      <ScreenHeader
        eyebrow={course ? `Curso · Nivel ${course.level}` : "Curso"}
        title={course?.title ?? "Curso"}
        subtitle={course?.description || undefined}
      />
      <DataLoader query={courseDetailQuery} emptyMessage="No encontramos este curso entre los tuyos.">
        {(course) => (
          <>
            <Card padded={false} className="mx-3 mt-[18px] p-1">
              <View className="flex-row border-b border-line-soft">
                <Fact
                  label="Día"
                  value={course.day ? capitalize(course.day) : "Por definir"}
                  className="border-r border-line-soft"
                />
                <Fact label="Inicio" value={course.startDate ? formatDayMonth(course.startDate) : "Sin fecha"} />
              </View>
              <View className="flex-row">
                <Fact label="Sede" value={branchQuery.data?.name ?? "Sin sede"} className="border-r border-line-soft" />
                <Fact label="Profesor" value={course.teacher} />
              </View>
            </Card>

            {SHOW_FEATURE_MOCKS && <CourseProgressCardMock />}

            <View className="flex-row gap-2.5 px-3 pt-2.5">
              <Pressable
                onPress={() => router.push("/private/payments")}
                accessibilityRole="button"
                accessibilityLabel={`Pago: ${standingLabel[course.paymentStatus] ?? course.paymentStatus}`}
                className="flex-1 gap-2 rounded-[18px] bg-surface p-4 active:opacity-80"
              >
                <AppText variant="label" tone="muted" className="text-[10px]">
                  Pago
                </AppText>
                <Chip
                  label={standingLabel[course.paymentStatus] ?? course.paymentStatus}
                  tone={statusTone(course.paymentStatus)}
                />
                {course.nextPaymentDate && (
                  <AppText tone="muted" className="text-[13px]">
                    Vence {formatShortDate(course.nextPaymentDate).toLowerCase()}
                  </AppText>
                )}
              </Pressable>
              <Card className="flex-1 gap-2">
                <AppText variant="label" tone="muted" className="text-[10px]">
                  Asistencia
                </AppText>
                <AppText variant="heavy" className="text-[24px] leading-[28px]">
                  {attendedCount}
                  <AppText variant="semibold" tone="muted" className="text-[15px]">
                    {` / ${classes.length}`}
                  </AppText>
                </AppText>
                <View className="h-1.5 overflow-hidden rounded-full bg-control">
                  <View className="h-full bg-ink" style={{ width: `${attendedPercent}%` }} />
                </View>
              </Card>
            </View>

            <SectionHeader title="Clases" note={classes.length === 1 ? "1 clase" : `${classes.length} clases`} />
            <DataLoader query={classesQuery} emptyMessage="Este curso todavía no tiene clases.">
              {(list) => (
                <Card padded={false} className="mx-3 py-1">
                  {list.map((cls, i) => {
                    const chip = classChip(cls);
                    return (
                      <ClassRow
                        key={cls.id}
                        number={i + 1}
                        title={cls.title || `Clase ${i + 1}`}
                        detail={classWhen(cls.date, cls.startTime)}
                        highlighted={cls.date === today}
                        divider={i < list.length - 1}
                        onPress={() =>
                          router.push({ pathname: "/private/user/class/[classId]", params: { classId: cls.id } })
                        }
                        right={chip ? <Chip {...chip} /> : undefined}
                      />
                    );
                  })}
                </Card>
              )}
            </DataLoader>
          </>
        )}
      </DataLoader>
    </Screen>
  );
};

export default CourseDetail;
