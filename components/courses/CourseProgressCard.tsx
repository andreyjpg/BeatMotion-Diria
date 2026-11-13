import ProgressBlocks, { ProgressSwatch } from "@/components/courses/ProgressBlocks";
import AppText from "@/components/ui/AppText";
import { formatLongDate, formatPercent, formatShortDate, hhmmTo12h, plural } from "@/constants/helpers";
import type { CourseProgress, ProgressBlockState } from "@/hooks/courses/courseProgress";
import { View } from "react-native";

const SWATCH_SIZE = 12;

type HeroTexts = {
  label: string;
  /** The big number. */
  value: string;
  /** Two lines on the right of the number. */
  top: string;
  bottom: string;
  note: string;
};

type LegendItem = { state: ProgressBlockState; label: string };

/** "lun 2 nov" ("" without a date). */
const dayLabel = (date: Date | null) => (date ? formatShortDate(date).toLowerCase() : "");

/** "a la clase que queda", "a las 4 clases que quedan". */
const toClassesLeft = (count: number) =>
  count === 1 ? "a la clase que queda" : `a las ${count} clases que quedan`;

/** What attending every class left would leave the attendance at. */
const projectionNote = ({ projectedPercent, isClassToday, remainingClasses }: CourseProgress) => {
  if (projectedPercent === null) return "";
  const ending = `terminas con ${formatPercent(projectedPercent)} de asistencia.`;
  if (!isClassToday) return `Si vienes ${toClassesLeft(remainingClasses)}, ${ending}`;
  if (remainingClasses === 0) return `Si vienes hoy, ${ending}`;
  return `Si vienes hoy y ${toClassesLeft(remainingClasses)}, ${ending}`;
};

/** "Próxima · lun 26 oct · 7:00 p. m." */
const nextClassLabel = (date: Date | null, startTime: string | null) =>
  ["Próxima", dayLabel(date), hhmmTo12h(startTime)].filter(Boolean).join(" · ");

/** A course with class dates: its progress through the calendar. */
const calendarTexts = (progress: CourseProgress, startTime: string | null): HeroTexts => {
  const { phase, attendancePercent, attended, missed } = progress;
  if (phase === "notStarted") {
    const time = hhmmTo12h(startTime);
    const firstClass = progress.firstClassDate ? formatLongDate(progress.firstClassDate) : "";
    return {
      label: "Progreso del curso",
      value: formatPercent(0),
      top: "Empieza el",
      bottom: dayLabel(progress.firstClassDate),
      note: `Tu primera clase es el ${firstClass}${time ? ` a las ${time}` : ""}.`,
    };
  }
  if (phase === "finished") {
    return {
      label: "Curso terminado",
      value: formatPercent(progress.progressPercent),
      top: "Terminó el",
      bottom: dayLabel(progress.lastClassDate),
      note:
        attendancePercent === null
          ? "No hubo clases con asistencia registrada."
          : `Terminaste con ${formatPercent(attendancePercent)} de asistencia (${attended} de ${attended + missed} clases dadas).`,
    };
  }
  return {
    label: "Progreso del curso",
    value: formatPercent(progress.progressPercent),
    top: `Clase ${progress.currentClass} de ${progress.totalClasses}`,
    bottom: progress.isClassToday ? "Hoy" : nextClassLabel(progress.nextClassDate, startTime),
    note: projectionNote(progress),
  };
};

/** A course without class dates: the attendance is all there is. */
const attendanceOnlyTexts = (progress: CourseProgress, hasEndDate: boolean): HeroTexts => {
  const { attendancePercent, attended, missed } = progress;
  const given = attended + missed;
  return {
    label: hasEndDate ? "Tu asistencia" : "Curso continuo",
    value: attendancePercent === null ? "—" : formatPercent(attendancePercent),
    top: "Asistencia",
    bottom: given > 0 ? `${attended} de ${plural(given, "clase", "clases")}` : "Aún no hay clases dadas",
    note: hasEndDate
      ? "Este curso no tiene su calendario completo: mostramos solo tu asistencia."
      : "Este curso no tiene fecha de cierre: mostramos solo tu asistencia.",
  };
};

/** Legend under the bar: what the student attended, missed and has left. */
const legendItems = (progress: CourseProgress): LegendItem[] => {
  if (progress.phase === "notStarted") {
    return [{ state: "upcoming", label: plural(progress.totalClasses, "clase", "clases") }];
  }
  const items: LegendItem[] = [
    { state: "attended", label: `Asististe ${progress.attended}` },
    { state: "missed", label: `Faltaste ${progress.missed}` },
  ];
  if (progress.noClass > 0) items.push({ state: "noClass", label: `Sin clase ${progress.noClass}` });
  if (progress.beforeJoining > 0) {
    items.push({ state: "beforeJoining", label: `Antes de tu ingreso ${progress.beforeJoining}` });
  }
  if (progress.remainingClasses > 0) items.push({ state: "upcoming", label: `Quedan ${progress.remainingClasses}` });
  return items;
};

type CourseProgressCardProps = {
  /** Null while it loads or when it failed. */
  progress: CourseProgress | null;
  isError: boolean;
  /** Without one, a course without class dates is a continuous course. */
  hasEndDate: boolean;
  /** The course's class time "HH:MM", for the first and next class. */
  startTime: string | null;
};

/** Black card on the student's course screen: how far along the course is, one block per class. */
const CourseProgressCard = ({ progress, isError, hasEndDate, startTime }: CourseProgressCardProps) => {
  if (!progress) {
    return (
      <View className="mx-3 mt-2.5 gap-2 rounded-[22px] bg-ink p-[18px]">
        <AppText variant="label" tone="hero-muted" className="text-[10px]">
          Progreso del curso
        </AppText>
        <AppText tone="hero-soft" className="text-[14px]">
          {isError ? "No pudimos cargar tu progreso. Desliza hacia abajo para intentarlo de nuevo." : "Cargando tu progreso…"}
        </AppText>
      </View>
    );
  }

  const texts = progress.hasCalendar ? calendarTexts(progress, startTime) : attendanceOnlyTexts(progress, hasEndDate);
  return (
    <View className="mx-3 mt-2.5 gap-3.5 rounded-[22px] bg-ink p-[18px]">
      <View className="flex-row items-end justify-between gap-3">
        <View className="gap-1.5">
          <AppText variant="label" tone="hero-muted" className="text-[10px]">
            {texts.label}
          </AppText>
          <AppText variant="heavy" tone="inverse" className="text-[44px] leading-[48px]">
            {texts.value}
          </AppText>
        </View>
        <View className="flex-1 items-end">
          <AppText tone="hero-soft" className="text-right text-[13.5px] leading-[19px]">
            {texts.top}
          </AppText>
          <AppText variant="bold" tone="inverse" className="text-right text-[13.5px] leading-[19px]">
            {texts.bottom}
          </AppText>
        </View>
      </View>
      {progress.hasCalendar && (
        <>
          <ProgressBlocks blocks={progress.blocks} theme="dark" />
          <View className="flex-row flex-wrap gap-3.5">
            {legendItems(progress).map((item) => (
              <View key={item.state} className="flex-row items-center gap-1.5">
                <ProgressSwatch state={item.state} theme="dark" size={SWATCH_SIZE} />
                <AppText tone="hero-soft" className="text-[12.5px]">
                  {item.label}
                </AppText>
              </View>
            ))}
          </View>
        </>
      )}
      {!!texts.note && (
        <AppText tone="hero-soft" className="border-t border-hero-line pt-3 text-[14px] leading-[20px]">
          {texts.note}
        </AppText>
      )}
    </View>
  );
};

export default CourseProgressCard;
