import ClassRow from "@/components/courses/ClassRow";
import CourseProgressCard from "@/components/courses/CourseProgressCard";
import CourseProgressTiles from "@/components/courses/CourseProgressTiles";
import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip, { statusTone, type ChipTone } from "@/components/ui/Chip";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import {
  classWhen,
  formatCourseSchedule,
  formatDayMonth,
  formatShortDate,
  formatYYYYMMDD,
  standingLabel,
} from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useBranchById } from "@/hooks/branches/useBranchById";
import { useClassesByCourseId } from "@/hooks/classes/useClassesByCourseId";
import { type ClassMark, toClassMarks } from "@/hooks/courses/courseProgress";
import { useCourseDetail } from "@/hooks/courses/useCourseDetail";
import { useCourseProgress } from "@/hooks/courses/useCourseProgress";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, RefreshControl, View } from "react-native";

type ClassChip = { label: string; tone: ChipTone };

/** A past class's chip, with the same rules as the progress blocks. */
const CLASS_MARK_CHIPS: Record<ClassMark, ClassChip> = {
  attended: { label: "Asististe", tone: "muted" },
  missed: { label: "Faltaste", tone: "line" },
  noClass: { label: "Sin clase", tone: "line" },
  beforeJoining: { label: "Antes de tu ingreso", tone: "line" },
};

/** "31 ago – 16 nov", "Desde el 23 sep" or "Sin fecha". */
const courseDatesLabel = (startDate: Date | null, endDate: Date | null) => {
  if (startDate && endDate) return `${formatDayMonth(startDate)} – ${formatDayMonth(endDate)}`;
  if (startDate) return `Desde el ${formatDayMonth(startDate)}`;
  return endDate ? `Hasta el ${formatDayMonth(endDate)}` : "Sin fecha";
};

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

/** A course the student is enrolled in: its details, their progress, their payment and its classes. */
const CourseDetail = () => {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { user: activeUser } = useActiveUser();
  const userId = activeUser?.uid ?? "";
  const classesQuery = useClassesByCourseId(courseId);
  const courseDetailQuery = useCourseDetail(userId, courseId);
  const branchQuery = useBranchById(courseDetailQuery.data?.branchId || "");
  const progressQuery = useCourseProgress(userId, courseDetailQuery.data);

  const course = courseDetailQuery.data;
  const classes = classesQuery.data ?? [];
  const today = formatYYYYMMDD(new Date());
  const nextClassId = classes.find((cls) => (cls.date ?? "") > today)?.id;
  const classMarks = progressQuery.facts ? toClassMarks(classes, progressQuery.facts) : new Map<string, ClassMark>();

  const classChip = (cls: (typeof classes)[number]): ClassChip | null => {
    if (cls.date === today) return { label: "Hoy", tone: "ok" };
    const mark = classMarks.get(cls.id);
    if (mark) return CLASS_MARK_CHIPS[mark];
    // A past class before its marks load gets no chip.
    if (cls.date && cls.date < today) return null;
    if (cls.id === nextClassId) return { label: "Próxima", tone: "line" };
    return cls.date ? { label: "Pendiente", tone: "line" } : null;
  };

  const refresh = () => {
    courseDetailQuery.refetch();
    classesQuery.refetch();
    progressQuery.refetch();
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
                  label="Horario"
                  value={formatCourseSchedule(course.day, course.startTime, course.endTime) || "Por definir"}
                  className="border-r border-line-soft"
                />
                <Fact label="Fechas" value={courseDatesLabel(course.startDate, course.endDate)} />
              </View>
              <View className="flex-row">
                <Fact label="Sede" value={branchQuery.data?.name ?? "Sin sede"} className="border-r border-line-soft" />
                <Fact label="Profesor" value={course.teacher} />
              </View>
            </Card>

            <CourseProgressCard
              progress={progressQuery.progress}
              isError={progressQuery.isError}
              hasEndDate={!!course.endDate}
              startTime={course.startTime}
            />
            {progressQuery.progress && <CourseProgressTiles progress={progressQuery.progress} endDate={course.endDate} />}

            <Pressable
              onPress={() => router.push("/private/payments")}
              accessibilityRole="button"
              accessibilityLabel={`Pago: ${standingLabel[course.paymentStatus] ?? course.paymentStatus}`}
              className="mx-3 mt-2.5 flex-row items-center gap-2.5 rounded-[18px] bg-surface px-4 py-3.5 active:opacity-80"
            >
              <Chip
                label={standingLabel[course.paymentStatus] ?? course.paymentStatus}
                tone={statusTone(course.paymentStatus)}
              />
              <AppText className="flex-1 text-[14px]" numberOfLines={1}>
                {course.nextPaymentDate
                  ? `Mensualidad · vence ${formatShortDate(course.nextPaymentDate).toLowerCase()}`
                  : "Mensualidad"}
              </AppText>
              <Ionicons name="chevron-forward" size={18} color={palette.ink} />
            </Pressable>

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
