import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { plural } from "@/constants/helpers";
import { useAttendanceReport } from "@/hooks/reports/useAttendanceReport";
import { View } from "react-native";
import ReportBreakdown, { BREAKDOWN_COLOR } from "./ReportBreakdown";
import ReportCardTitle from "./ReportCardTitle";
import ReportHeadline from "./ReportHeadline";
import ReportScroll from "./ReportScroll";

/** The attendance rate, overall and per course. */
const AttendanceReport = () => {
  const attendanceReport = useAttendanceReport();

  return (
    <DataLoader query={attendanceReport} emptyMessage="No hay datos de asistencia.">
      {(data, isRefetching, refetch) => (
        <ReportScroll isRefetching={isRefetching} refetch={refetch}>
          <ReportHeadline label="Tasa de asistencia · promedio general" value={`${data.attendanceRate}%`} />
          <ReportBreakdown
            title={plural(data.totalAttendanceRecords, "registro", "registros")}
            note={`en ${plural(data.totalClasses, "clase", "clases")}`}
            parts={[
              { label: "Asistieron", value: data.attendedCount, color: BREAKDOWN_COLOR.done },
              { label: "Ausentes", value: data.absentCount, color: BREAKDOWN_COLOR.notDone },
            ]}
          />
          {data.attendanceByCourse.length > 0 && (
            <Card className="pb-1.5">
              <ReportCardTitle title="Por curso" />
              <View className="mt-1">
                {data.attendanceByCourse.map((course, index) => (
                  <View
                    key={course.courseId}
                    className={`gap-1.5 py-3 ${
                      index < data.attendanceByCourse.length - 1 ? "border-b border-line-soft" : ""
                    }`}
                  >
                    <View className="flex-row items-baseline gap-3">
                      <AppText variant="semibold" className="flex-1 text-[14.5px]" numberOfLines={1}>
                        {course.courseName}
                      </AppText>
                      <AppText variant="bold" className="text-[14.5px]">
                        {`${course.attendanceRate}%`}
                      </AppText>
                    </View>
                    <ProgressBar percent={course.attendanceRate} height={8} />
                    <AppText tone="muted" className="text-[12.5px]">
                      {`${plural(course.totalClasses, "clase", "clases")} · ${plural(
                        course.totalAttendance,
                        "registro",
                        "registros",
                      )}`}
                    </AppText>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </ReportScroll>
      )}
    </DataLoader>
  );
};

export default AttendanceReport;
