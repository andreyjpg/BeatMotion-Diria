import AppText from "@/components/ui/AppText";
import ProgressBar from "@/components/ui/ProgressBar";
import { capitalize, formatLongDate, formatShortDate, formatTimeRange, plural } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { type CalendarProgress, toCalendarProgress } from "@/hooks/courses/courseProgress";
import type { CourseType } from "@/hooks/courses/schema/courseSchema";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

const BAR_HEIGHT = 6;

/** "Clase 8 de 12", "Inicia lun 2 nov" or "Terminó lun 12 oct". */
const progressHeadline = ({ phase, currentClass, totalClasses, firstClassDate, lastClassDate }: CalendarProgress) => {
  if (phase === "notStarted" && firstClassDate) return `Inicia ${formatShortDate(firstClassDate).toLowerCase()}`;
  if (phase === "finished" && lastClassDate) return `Terminó ${formatShortDate(lastClassDate).toLowerCase()}`;
  return `Clase ${currentClass} de ${totalClasses}`;
};

/** For screen readers: "clase 8 de 12, hoy", "inicia el lunes 2 de noviembre, 12 clases" or "terminó el lunes 12 de octubre". */
const progressDescription = (calendar: CalendarProgress) => {
  const { phase, currentClass, totalClasses, isClassToday, firstClassDate, lastClassDate } = calendar;
  if (phase === "notStarted" && firstClassDate) {
    return `inicia el ${formatLongDate(firstClassDate)}, ${plural(totalClasses, "clase", "clases")}`;
  }
  if (phase === "finished" && lastClassDate) return `terminó el ${formatLongDate(lastClassDate)}`;
  return `clase ${currentClass} de ${totalClasses}${isClassToday ? ", hoy" : ""}`;
};

type CourseTileProps = {
  course: CourseType;
  onPress: () => void;
};

/** A "Mis cursos" tile on the teacher's home: day, level, hours and, with a full calendar, "Clase X de N" and a bar. */
const CourseTile = ({ course, onPress }: CourseTileProps) => {
  const hours = formatTimeRange(course.startTime, course.endTime);
  // The calendar only: the tiles make no attendance queries.
  const calendar = toCalendarProgress(course);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={calendar.hasCalendar ? `${course.title}, ${progressDescription(calendar)}` : course.title}
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
      {/* Own line: the tile is half the screen wide. */}
      {hours !== "" && (
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={13} color={palette.muted} />
          <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
            {hours}
          </AppText>
        </View>
      )}
      {calendar.hasCalendar && (
        <View className="mt-2 gap-2 border-t border-line-soft pt-2.5">
          <View className="flex-row items-baseline justify-between gap-1.5">
            <AppText variant="bold" className="flex-1 text-[13.5px]" numberOfLines={1}>
              {progressHeadline(calendar)}
            </AppText>
            {calendar.isClassToday && (
              <AppText variant="label-bold" className="text-[10px]">
                Hoy
              </AppText>
            )}
          </View>
          <ProgressBar percent={calendar.progressPercent} height={BAR_HEIGHT} />
        </View>
      )}
    </Pressable>
  );
};

export default CourseTile;
