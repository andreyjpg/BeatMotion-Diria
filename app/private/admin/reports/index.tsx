import AttendanceReport from "@/components/reports/AttendanceReport";
import EnrollmentReport from "@/components/reports/EnrollmentReport";
import PaymentReport from "@/components/reports/PaymentReport";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useState } from "react";

type ReportTab = "payments" | "enrollment" | "attendance";

const REPORT_TABS: { value: ReportTab; label: string }[] = [
  { value: "payments", label: "Pagos" },
  { value: "enrollment", label: "Matrículas" },
  { value: "attendance", label: "Asistencia" },
];

/** Admin: totals for payments, enrollments and attendance. */
const ReportsCenter = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>("payments");

  return (
    <Screen scroll={false}>
      <ScreenHeader eyebrow="Administración" title="Reportes" subtitle="Pagos, matrículas y asistencia." />
      <SegmentedControl
        segments={REPORT_TABS}
        value={activeTab}
        onChange={setActiveTab}
        accessibilityLabel="Tipo de reporte"
        className="mx-5 mt-4"
      />
      {activeTab === "payments" && <PaymentReport />}
      {activeTab === "enrollment" && <EnrollmentReport />}
      {activeTab === "attendance" && <AttendanceReport />}
    </Screen>
  );
};

export default ReportsCenter;
