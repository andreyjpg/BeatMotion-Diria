import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import { daysBetween, formatDayMonth, formatPercent, plural } from "@/constants/helpers";
import type { CourseProgress } from "@/hooks/courses/courseProgress";
import { View } from "react-native";

const DAYS_PER_WEEK = 7;

/** One number of the course's summary. */
const Tile = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <Card className="flex-1 gap-1">
    <AppText variant="label" tone="muted" className="text-[10px]">
      {label}
    </AppText>
    <AppText variant="heavy" className="text-[26px] leading-[30px]">
      {value}
    </AppText>
    <AppText tone="muted" className="text-[12.5px]">
      {detail}
    </AppText>
  </Card>
);

/** "6 de 7 clases dadas": the classes the attendance counts. */
const attendanceDetail = ({ phase, attended, missed }: CourseProgress) => {
  if (phase === "notStarted") return "Aún no hay clases";
  const given = attended + missed;
  return given > 0 ? `${attended} de ${plural(given, "clase dada", "clases dadas")}` : "Aún no hay clases dadas";
};

/** "En 4 semanas", "En 3 días", "Hoy", "Curso completo" or "Sin fecha de cierre". */
const endDetail = (lastDay: Date | null, isFinished: boolean) => {
  if (!lastDay) return "Sin fecha de cierre";
  if (isFinished) return "Curso completo";
  const days = daysBetween(new Date(), lastDay);
  if (days <= 0) return "Hoy";
  if (days < DAYS_PER_WEEK) return `En ${plural(days, "día", "días")}`;
  return `En ${plural(Math.round(days / DAYS_PER_WEEK), "semana", "semanas")}`;
};

type CourseProgressTilesProps = {
  progress: CourseProgress;
  /** The course's last day, for courses without class dates. */
  endDate: Date | null;
};

/** Two tiles under the progress card: the attendance and when the course ends. */
const CourseProgressTiles = ({ progress, endDate }: CourseProgressTilesProps) => {
  const lastDay = progress.lastClassDate ?? endDate;
  const isFinished = progress.phase === "finished";
  return (
    <View className="flex-row gap-2.5 px-3 pt-2.5">
      <Tile
        label="Asistencia"
        value={progress.attendancePercent === null ? "—" : formatPercent(progress.attendancePercent)}
        detail={attendanceDetail(progress)}
      />
      <Tile
        label={isFinished ? "Terminó" : "Termina"}
        value={lastDay ? formatDayMonth(lastDay) : "—"}
        detail={endDetail(lastDay, isFinished)}
      />
    </View>
  );
};

export default CourseProgressTiles;
