import ProgressHeroCard, {
  dayLabel,
  nextClassLabel,
  type ProgressHeroBar,
  ProgressHeroMessage,
  type ProgressHeroTexts,
  type ProgressLegendItem,
} from "@/components/courses/ProgressHeroCard";
import { formatLongDate, formatPercent, hhmmTo12h, plural } from "@/constants/helpers";
import type { CourseProgress } from "@/hooks/courses/courseProgress";

const CARD_MARGINS = "mx-3 mt-2.5";

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

/** A course with class dates: its progress through the calendar. */
const calendarTexts = (progress: CourseProgress, startTime: string | null): ProgressHeroTexts => {
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
const attendanceOnlyTexts = (progress: CourseProgress, hasEndDate: boolean): ProgressHeroTexts => {
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
const legendItems = (progress: CourseProgress): ProgressLegendItem[] => {
  if (progress.phase === "notStarted") {
    return [{ state: "upcoming", label: plural(progress.totalClasses, "clase", "clases") }];
  }
  const items: ProgressLegendItem[] = [
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
      <ProgressHeroMessage
        message={isError ? "No pudimos cargar tu progreso. Desliza hacia abajo para intentarlo de nuevo." : "Cargando tu progreso…"}
        className={CARD_MARGINS}
      />
    );
  }

  const texts = progress.hasCalendar ? calendarTexts(progress, startTime) : attendanceOnlyTexts(progress, hasEndDate);
  const bar: ProgressHeroBar | undefined = progress.hasCalendar
    ? { blocks: progress.blocks, legend: legendItems(progress), viewer: "student" }
    : undefined;
  return <ProgressHeroCard texts={texts} bar={bar} className={CARD_MARGINS} />;
};

export default CourseProgressCard;
