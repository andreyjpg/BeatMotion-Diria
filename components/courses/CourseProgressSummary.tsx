import ProgressBlocks from "@/components/courses/ProgressBlocks";
import AppText from "@/components/ui/AppText";
import { formatDayMonth, formatPercent, formatShortDate, plural } from "@/constants/helpers";
import type { CourseProgress } from "@/hooks/courses/courseProgress";
import type { CourseSchemaWithMember } from "@/hooks/courses/schema/courseSchema";
import { useCourseProgress } from "@/hooks/courses/useCourseProgress";
import { View } from "react-native";

/** The three lines of the section: a headline, a note on its right and a footer. */
type SummaryTexts = { headline: string; aside: string; footer: string };

/** "lun 2 nov" ("" without a date). */
const dayLabel = (date: Date | null) => (date ? formatShortDate(date).toLowerCase() : "");

/** "Asistencia 86 % (6 de 7)", or "Asistencia —" with nothing to count. */
const attendanceText = ({ attendancePercent, attended, missed }: CourseProgress) =>
  attendancePercent === null
    ? "Asistencia —"
    : `Asistencia ${formatPercent(attendancePercent)} (${attended} de ${attended + missed})`;

/** A course with class dates: where it is in its calendar. */
const calendarTexts = (progress: CourseProgress): SummaryTexts => {
  const { phase, totalClasses, currentClass, remainingClasses, isClassToday, noClass } = progress;
  const noClassText = noClass > 0 ? `${noClass} sin clase` : "";
  if (phase === "notStarted") {
    return {
      headline: `Empieza el ${dayLabel(progress.firstClassDate)}`,
      aside: plural(totalClasses, "clase", "clases"),
      footer: attendanceText(progress),
    };
  }
  if (phase === "finished") {
    return {
      headline: `Terminó el ${dayLabel(progress.lastClassDate)}`,
      aside: `${totalClasses} de ${totalClasses}`,
      footer: [attendanceText(progress), noClassText].filter(Boolean).join(" · "),
    };
  }
  const remainingText = remainingClasses === 0 ? "Última clase" : `Quedan ${remainingClasses}`;
  return {
    headline: `Clase ${currentClass} de ${totalClasses}${isClassToday ? " · hoy" : ""}`,
    aside: isClassToday && remainingClasses > 0 ? `${remainingText} después de hoy` : remainingText,
    footer: [attendanceText(progress), noClassText, `termina ${dayLabel(progress.lastClassDate)}`]
      .filter(Boolean)
      .join(" · "),
  };
};

/** A course without class dates (no end date, or no weekday or start date): attendance only. */
const attendanceOnlyTexts = (progress: CourseProgress, { startDate, endDate }: CourseSchemaWithMember): SummaryTexts => {
  const headline =
    progress.phase === "notStarted" && startDate ? `Empieza el ${dayLabel(startDate)}` : attendanceText(progress);
  if (endDate) {
    const ending = progress.phase === "finished" ? "Terminó" : "Termina";
    return { headline, aside: "", footer: `${ending} el ${dayLabel(endDate)}` };
  }
  return {
    headline,
    aside: "Curso continuo",
    footer: startDate ? `Desde el ${formatDayMonth(startDate)} · sin fecha de cierre` : "Sin fecha de cierre",
  };
};

type CourseProgressSummaryProps = {
  userId: string;
  course: CourseSchemaWithMember;
};

/** Progress section of a Mis cursos card: "Clase X de N", one block per class and the attendance. */
const CourseProgressSummary = ({ userId, course }: CourseProgressSummaryProps) => {
  const { progress, isError } = useCourseProgress(userId, course);

  if (!progress) {
    return (
      <View className="border-t border-line-soft pt-3">
        <AppText tone="muted" className="text-[12.5px]">
          {isError ? "No pudimos cargar tu progreso." : "Cargando tu progreso…"}
        </AppText>
      </View>
    );
  }

  const texts = progress.hasCalendar ? calendarTexts(progress) : attendanceOnlyTexts(progress, course);
  return (
    <View className="gap-2 border-t border-line-soft pt-3">
      <View className="flex-row items-baseline justify-between gap-2">
        <AppText variant="bold" className="flex-1 text-[14px]">
          {texts.headline}
        </AppText>
        {!!texts.aside && (
          <AppText variant="label" tone="muted" className="text-[10px]">
            {texts.aside}
          </AppText>
        )}
      </View>
      {progress.hasCalendar && <ProgressBlocks blocks={progress.blocks} />}
      <AppText tone="muted" className="text-[12.5px]">
        {texts.footer}
      </AppText>
    </View>
  );
};

export default CourseProgressSummary;
