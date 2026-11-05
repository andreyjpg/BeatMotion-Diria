import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import InfoRow from "@/components/ui/InfoRow";
import { formatMonthLabel, plural } from "@/constants/helpers";
import { useEnrollmentReport } from "@/hooks/reports/useEnrollmentReport";
import { View } from "react-native";
import ReportBreakdown, { BREAKDOWN_COLOR } from "./ReportBreakdown";
import ReportCardTitle from "./ReportCardTitle";
import ReportHeadline from "./ReportHeadline";
import ReportScroll from "./ReportScroll";

/** Enrollment requests by status, by course and by month. */
const EnrollmentReport = () => {
  const enrollmentReport = useEnrollmentReport();

  return (
    <DataLoader query={enrollmentReport} emptyMessage="No hay datos de matrículas.">
      {(data, isRefetching, refetch) => (
        <ReportScroll isRefetching={isRefetching} refetch={refetch}>
          <ReportHeadline label="Matrículas aprobadas" value={data.approvedEnrollments} />
          <ReportBreakdown
            title={plural(data.totalEnrollments, "solicitud", "solicitudes")}
            note={data.totalEnrollments === 1 ? "registrada" : "registradas"}
            parts={[
              { label: "Aprobadas", value: data.approvedEnrollments, color: BREAKDOWN_COLOR.done },
              { label: "Pendientes", value: data.pendingEnrollments, color: BREAKDOWN_COLOR.waiting },
              { label: "Rechazadas", value: data.rejectedEnrollments, color: BREAKDOWN_COLOR.notDone },
            ]}
          />
          {data.enrollmentsByCourse.length > 0 && (
            <Card className="pb-1.5">
              <ReportCardTitle title="Por curso" />
              <View className="mt-1">
                {data.enrollmentsByCourse.map((course, index) => (
                  <View
                    key={course.courseId}
                    className={`flex-row items-center gap-3 py-3 ${
                      index < data.enrollmentsByCourse.length - 1 ? "border-b border-line-soft" : ""
                    }`}
                  >
                    <View className="flex-1">
                      <AppText variant="semibold" className="text-[14.5px]" numberOfLines={1}>
                        {course.courseName}
                      </AppText>
                      <AppText tone="muted" className="text-[12.5px]">
                        {`${plural(course.approvedCount, "aprobada", "aprobadas")} de ${course.count}`}
                      </AppText>
                    </View>
                    <AppText variant="bold" className="text-[15px]">
                      {course.count}
                    </AppText>
                  </View>
                ))}
              </View>
            </Card>
          )}
          {data.enrollmentsByMonth.length > 0 && (
            <Card className="pb-1.5">
              <ReportCardTitle title="Por mes" />
              <View className="mt-1">
                {data.enrollmentsByMonth.map((item, index) => (
                  <InfoRow
                    key={item.month}
                    label={formatMonthLabel(item.month)}
                    divider={index < data.enrollmentsByMonth.length - 1}
                  >
                    {plural(item.count, "solicitud", "solicitudes")}
                  </InfoRow>
                ))}
              </View>
            </Card>
          )}
        </ReportScroll>
      )}
    </DataLoader>
  );
};

export default EnrollmentReport;
