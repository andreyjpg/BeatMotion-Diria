import ProgressHeroCard, {
  dayLabel,
  nextClassLabel,
  ProgressHeroMessage,
  type ProgressHeroTexts,
  type ProgressLegendItem,
} from "@/components/courses/ProgressHeroCard";
import { daysBetween, formatLongDate, formatPercent, hhmmTo12h, plural } from "@/constants/helpers";
import type { StaffCourseProgress } from "@/hooks/courses/courseProgress";

const DAYS_PER_WEEK = 7;
const CARD_MARGINS = "mx-3 mt-4";

/** "Termina el lunes 16 de noviembre, en 4 semanas." */
const endNote = (lastClassDate: Date | null) => {
  if (!lastClassDate) return "";
  const days = daysBetween(new Date(), lastClassDate);
  if (days <= 0) return "Hoy es la última clase del curso.";
  const inTime =
    days < DAYS_PER_WEEK
      ? plural(days, "día", "días")
      : plural(Math.round(days / DAYS_PER_WEEK), "semana", "semanas");
  return `Termina el ${formatLongDate(lastClassDate)}, en ${inTime}.`;
};

/** "La primera clase es el lunes 2 de noviembre a las 7:00 p. m. Termina el lunes 18 de enero." */
const firstClassNote = ({ firstClassDate, lastClassDate, totalClasses }: StaffCourseProgress, startTime: string | null) => {
  if (!firstClassDate) return "";
  const time = hhmmTo12h(startTime);
  const first = `La primera clase es el ${formatLongDate(firstClassDate)}${time ? ` a las ${time}` : ""}.`;
  return lastClassDate && totalClasses > 1 ? `${first} Termina el ${formatLongDate(lastClassDate)}.` : first;
};

/** "Se dieron 11 de las 12 fechas del curso." */
const givenNote = ({ given, totalClasses }: StaffCourseProgress) => {
  const dates = totalClasses === 1 ? "la única fecha" : `las ${totalClasses} fechas`;
  return `Se ${given === 1 ? "dio" : "dieron"} ${given} de ${dates} del curso.`;
};

const staffTexts = (progress: StaffCourseProgress, startTime: string | null): ProgressHeroTexts => {
  if (progress.phase === "notStarted") {
    return {
      label: "Progreso del curso",
      value: formatPercent(0),
      top: "Inicia el",
      bottom: dayLabel(progress.firstClassDate),
      note: firstClassNote(progress, startTime),
    };
  }
  if (progress.phase === "finished") {
    return {
      label: "Curso terminado",
      value: formatPercent(progress.progressPercent),
      top: "Terminó el",
      bottom: dayLabel(progress.lastClassDate),
      note: givenNote(progress),
    };
  }
  return {
    label: "Progreso del curso",
    value: formatPercent(progress.progressPercent),
    top: `Clase ${progress.currentClass} de ${progress.totalClasses}`,
    bottom: progress.isClassToday ? "Hoy" : nextClassLabel(progress.nextClassDate, startTime),
    note: endNote(progress.lastClassDate),
  };
};

/** Legend under the bar: "Dadas 6 · Sin clase 1 · Quedan 4", or "12 clases" before the course starts. */
const legendItems = (progress: StaffCourseProgress): ProgressLegendItem[] => {
  if (progress.phase === "notStarted") {
    return [{ state: "upcoming", label: plural(progress.totalClasses, "clase", "clases") }];
  }
  const items: ProgressLegendItem[] = [{ state: "given", label: `Dadas ${progress.given}` }];
  if (progress.noClass > 0) items.push({ state: "noClass", label: `Sin clase ${progress.noClass}` });
  if (progress.remainingClasses > 0) items.push({ state: "upcoming", label: `Quedan ${progress.remainingClasses}` });
  return items;
};

type StaffCourseProgressCardProps = {
  /** Null while it loads or when it failed. Only for courses with class dates. */
  progress: StaffCourseProgress | null;
  isError: boolean;
  /** The course's class time "HH:MM", for the first and next class. */
  startTime: string | null;
};

/**
 * Black card on the teacher's and admin's course screens: "Clase X de N" and
 * its percentage from the calendar, one block per class date (given, no
 * class, today, to come).
 */
const StaffCourseProgressCard = ({ progress, isError, startTime }: StaffCourseProgressCardProps) => {
  if (!progress) {
    return (
      <ProgressHeroMessage
        message={
          isError ? "No pudimos cargar el progreso. Desliza hacia abajo para intentarlo de nuevo." : "Cargando el progreso…"
        }
        className={CARD_MARGINS}
      />
    );
  }

  return (
    <ProgressHeroCard
      texts={staffTexts(progress, startTime)}
      bar={{ blocks: progress.blocks, legend: legendItems(progress), viewer: "staff" }}
      className={CARD_MARGINS}
    />
  );
};

export default StaffCourseProgressCard;
