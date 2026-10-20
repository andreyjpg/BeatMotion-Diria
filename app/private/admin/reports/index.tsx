import DataLoader from "@/components/DataLoader";
import FilterPills from "@/components/FilterPills";
import HeaderTitle from "@/components/headerTitle";
import { formatCurrency, formatMonthLabel } from "@/constants/helpers";
import { useAttendanceReport } from "@/hooks/reports/useAttendanceReport";
import { useEnrollmentReport } from "@/hooks/reports/useEnrollmentReport";
import { usePaymentReport } from "@/hooks/reports/usePaymentReport";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ReportTab = "payments" | "attendance" | "enrollment";

const REPORT_TABS = [
  { label: "Pagos", value: "payments" },
  { label: "Asistencia", value: "attendance" },
  { label: "Matrículas", value: "enrollment" },
];

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  title: string;
  value: string | number;
  subtitle?: string;
};

const StatCard = ({
  icon,
  iconColor,
  bgColor,
  title,
  value,
  subtitle,
}: StatCardProps) => (
  <View className={`${bgColor} rounded-2xl p-4 flex-1 min-w-[45%]`}>
    <View className="flex-row items-center gap-2 mb-2">
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text className="text-gray-400 text-xs">{title}</Text>
    </View>
    <Text className="text-white text-xl font-bold">{value}</Text>
    {subtitle && <Text className="text-gray-500 text-xs mt-1">{subtitle}</Text>}
  </View>
);

type ProgressBarProps = {
  label: string;
  value: number;
  total: number;
  color: string;
};

const ProgressBar = ({ label, value, total, color }: ProgressBarProps) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-300 text-sm">{label}</Text>
        <Text className="text-gray-400 text-sm">
          {value} ({percentage}%)
        </Text>
      </View>
      <View className="bg-gray-800 rounded-full h-2 overflow-hidden">
        <View
          className={`${color} h-full rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  );
};

const PaymentReportContent = () => {
  const paymentReport = usePaymentReport();

  return (
    <DataLoader query={paymentReport} emptyMessage="No hay datos de pagos">
      {(data, isRefetching, refetch) => (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#40E0D0"
            />
          }
        >
          {/* Summary Cards */}
          <View className="px-4 mb-4">
            <Text className="text-white text-lg font-semibold mb-3">
              Resumen General
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <StatCard
                icon="cash-outline"
                iconColor="#10B981"
                bgColor="bg-gray-900"
                title="Ingresos Totales"
                value={formatCurrency(data.totalRevenue)}
                subtitle="Pagos aprobados"
              />
              <StatCard
                icon="receipt-outline"
                iconColor="#3B82F6"
                bgColor="bg-gray-900"
                title="Total Pagos"
                value={data.totalPayments}
                subtitle="Registrados"
              />
            </View>
          </View>

          {/* Status Distribution */}
          <View className="px-4 mb-4">
            <View className="bg-gray-900 rounded-2xl p-4">
              <View className="flex-row items-center gap-2 mb-4">
                <Ionicons name="pie-chart-outline" size={20} color="#40E0D0" />
                <Text className="text-white font-semibold">
                  Estado de Pagos
                </Text>
              </View>
              <ProgressBar
                label="Aprobados"
                value={data.approvedPayments}
                total={data.totalPayments}
                color="bg-green-500"
              />
              <ProgressBar
                label="Pendientes"
                value={data.pendingPayments}
                total={data.totalPayments}
                color="bg-yellow-500"
              />
              <ProgressBar
                label="Rechazados"
                value={data.rejectedPayments}
                total={data.totalPayments}
                color="bg-red-500"
              />
            </View>
          </View>

          {/* Late Payments */}
          <View className="px-4 mb-4">
            <View className="bg-gray-900 rounded-2xl p-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
                <Text className="text-white font-semibold">Pagos Tardíos</Text>
              </View>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-gray-400 text-sm">Cantidad</Text>
                  <Text className="text-white text-lg font-bold">
                    {data.latePaymentsCount}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-400 text-sm">Multas cobradas</Text>
                  <Text className="text-yellow-400 text-lg font-bold">
                    {formatCurrency(data.latePaymentsRevenue)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Monthly Trend */}
          {data.paymentsByMonth.length > 0 && (
            <View className="px-4 mb-4">
              <View className="bg-gray-900 rounded-2xl p-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Ionicons
                    name="trending-up-outline"
                    size={20}
                    color="#40E0D0"
                  />
                  <Text className="text-white font-semibold">
                    Pagos por Mes
                  </Text>
                </View>
                {data.paymentsByMonth.map((item, index) => (
                  <View
                    key={index}
                    className="flex-row justify-between py-2 border-b border-gray-800"
                  >
                    <Text className="text-gray-300">{formatMonthLabel(item.month)}</Text>
                    <View className="flex-row gap-4">
                      <Text className="text-gray-400">{item.count} pagos</Text>
                      <Text className="text-green-400 font-semibold">
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </DataLoader>
  );
};

const AttendanceReportContent = () => {
  const attendanceReport = useAttendanceReport();

  return (
    <DataLoader
      query={attendanceReport}
      emptyMessage="No hay datos de asistencia"
    >
      {(data, isRefetching, refetch) => (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#40E0D0"
            />
          }
        >
          {/* Summary Cards */}
          <View className="px-4 mb-4">
            <Text className="text-white text-lg font-semibold mb-3">
              Resumen General
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <StatCard
                icon="checkmark-circle-outline"
                iconColor="#10B981"
                bgColor="bg-gray-900"
                title="Tasa de Asistencia"
                value={`${data.attendanceRate}%`}
                subtitle="Promedio general"
              />
              <StatCard
                icon="calendar-outline"
                iconColor="#3B82F6"
                bgColor="bg-gray-900"
                title="Total Clases"
                value={data.totalClasses}
                subtitle="Registradas"
              />
            </View>
          </View>

          {/* Attendance Overview */}
          <View className="px-4 mb-4">
            <View className="bg-gray-900 rounded-2xl p-4">
              <View className="flex-row items-center gap-2 mb-4">
                <Ionicons name="people-outline" size={20} color="#40E0D0" />
                <Text className="text-white font-semibold">
                  Detalle de Asistencia
                </Text>
              </View>
              <View className="flex-row justify-around">
                <View className="items-center">
                  <View className="w-16 h-16 rounded-full bg-green-500/20 items-center justify-center mb-2">
                    <Ionicons name="checkmark" size={28} color="#10B981" />
                  </View>
                  <Text className="text-white text-xl font-bold">
                    {data.attendedCount}
                  </Text>
                  <Text className="text-gray-400 text-xs">Asistieron</Text>
                </View>
                <View className="items-center">
                  <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center mb-2">
                    <Ionicons name="close" size={28} color="#EF4444" />
                  </View>
                  <Text className="text-white text-xl font-bold">
                    {data.absentCount}
                  </Text>
                  <Text className="text-gray-400 text-xs">Ausentes</Text>
                </View>
                <View className="items-center">
                  <View className="w-16 h-16 rounded-full bg-blue-500/20 items-center justify-center mb-2">
                    <Ionicons
                      name="document-text-outline"
                      size={28}
                      color="#3B82F6"
                    />
                  </View>
                  <Text className="text-white text-xl font-bold">
                    {data.totalAttendanceRecords}
                  </Text>
                  <Text className="text-gray-400 text-xs">Registros</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Attendance by Course */}
          {data.attendanceByCourse.length > 0 && (
            <View className="px-4 mb-4">
              <View className="bg-gray-900 rounded-2xl p-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Ionicons name="school-outline" size={20} color="#40E0D0" />
                  <Text className="text-white font-semibold">
                    Asistencia por Curso
                  </Text>
                </View>
                {data.attendanceByCourse.map((course, index) => (
                  <View
                    key={index}
                    className="py-3 border-b border-gray-800 last:border-b-0"
                  >
                    <View className="flex-row justify-between items-center mb-2">
                      <Text
                        className="text-gray-300 flex-1"
                        numberOfLines={1}
                      >
                        {course.courseName}
                      </Text>
                      <Text
                        className={`font-bold ${
                          course.attendanceRate >= 70
                            ? "text-green-400"
                            : course.attendanceRate >= 50
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {course.attendanceRate}%
                      </Text>
                    </View>
                    <View className="bg-gray-800 rounded-full h-2 overflow-hidden">
                      <View
                        className={`h-full rounded-full ${
                          course.attendanceRate >= 70
                            ? "bg-green-500"
                            : course.attendanceRate >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${course.attendanceRate}%` }}
                      />
                    </View>
                    <Text className="text-gray-500 text-xs mt-1">
                      {course.totalClasses} clases | {course.totalAttendance}{" "}
                      registros
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </DataLoader>
  );
};

const EnrollmentReportContent = () => {
  const enrollmentReport = useEnrollmentReport();

  return (
    <DataLoader
      query={enrollmentReport}
      emptyMessage="No hay datos de matrículas"
    >
      {(data, isRefetching, refetch) => (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#40E0D0"
            />
          }
        >
          {/* Summary Cards */}
          <View className="px-4 mb-4">
            <Text className="text-white text-lg font-semibold mb-3">
              Resumen General
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <StatCard
                icon="person-add-outline"
                iconColor="#10B981"
                bgColor="bg-gray-900"
                title="Matrículas Aprobadas"
                value={data.approvedEnrollments}
                subtitle="Estudiantes activos"
              />
              <StatCard
                icon="documents-outline"
                iconColor="#3B82F6"
                bgColor="bg-gray-900"
                title="Total Solicitudes"
                value={data.totalEnrollments}
                subtitle="Registradas"
              />
            </View>
          </View>

          {/* Status Distribution */}
          <View className="px-4 mb-4">
            <View className="bg-gray-900 rounded-2xl p-4">
              <View className="flex-row items-center gap-2 mb-4">
                <Ionicons name="pie-chart-outline" size={20} color="#40E0D0" />
                <Text className="text-white font-semibold">
                  Estado de Matrículas
                </Text>
              </View>
              <ProgressBar
                label="Aprobadas"
                value={data.approvedEnrollments}
                total={data.totalEnrollments}
                color="bg-green-500"
              />
              <ProgressBar
                label="Pendientes"
                value={data.pendingEnrollments}
                total={data.totalEnrollments}
                color="bg-yellow-500"
              />
              <ProgressBar
                label="Rechazadas"
                value={data.rejectedEnrollments}
                total={data.totalEnrollments}
                color="bg-red-500"
              />
            </View>
          </View>

          {/* Enrollments by Course */}
          {data.enrollmentsByCourse.length > 0 && (
            <View className="px-4 mb-4">
              <View className="bg-gray-900 rounded-2xl p-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Ionicons name="school-outline" size={20} color="#40E0D0" />
                  <Text className="text-white font-semibold">
                    Matrículas por Curso
                  </Text>
                </View>
                {data.enrollmentsByCourse.map((course, index) => (
                  <View
                    key={index}
                    className="flex-row justify-between items-center py-3 border-b border-gray-800 last:border-b-0"
                  >
                    <View className="flex-1">
                      <Text className="text-gray-300" numberOfLines={1}>
                        {course.courseName}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        {course.approvedCount} aprobadas de {course.count}
                      </Text>
                    </View>
                    <View className="bg-primary/20 px-3 py-1 rounded-full">
                      <Text className="text-primary font-semibold">
                        {course.count}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Monthly Trend */}
          {data.enrollmentsByMonth.length > 0 && (
            <View className="px-4 mb-4">
              <View className="bg-gray-900 rounded-2xl p-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Ionicons
                    name="trending-up-outline"
                    size={20}
                    color="#40E0D0"
                  />
                  <Text className="text-white font-semibold">
                    Matrículas por Mes
                  </Text>
                </View>
                {data.enrollmentsByMonth.map((item, index) => (
                  <View
                    key={index}
                    className="flex-row justify-between py-2 border-b border-gray-800 last:border-b-0"
                  >
                    <Text className="text-gray-300">{formatMonthLabel(item.month)}</Text>
                    <Text className="text-primary font-semibold">
                      {item.count} solicitudes
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </DataLoader>
  );
};

const ReportsCenter = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>("payments");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ReportTab);
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle
        title="Centro de Reportes"
        subtitle="Análisis y estadísticas"
      />

      <View className="items-center mb-4">
        <FilterPills
          options={REPORT_TABS}
          onSelect={handleTabChange}
          selected={activeTab}
        />
      </View>

      {activeTab === "payments" && <PaymentReportContent />}
      {activeTab === "attendance" && <AttendanceReportContent />}
      {activeTab === "enrollment" && <EnrollmentReportContent />}
    </SafeAreaView>
  );
};

export default ReportsCenter;
