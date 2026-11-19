import DataLoader from "@/components/DataLoader";
import Card from "@/components/ui/Card";
import InfoRow from "@/components/ui/InfoRow";
import { formatCurrency, formatMonthLabel, plural } from "@/constants/helpers";
import { usePaymentReport } from "@/hooks/reports/usePaymentReport";
import { View } from "react-native";
import ReportBreakdown, { BREAKDOWN_COLOR } from "./ReportBreakdown";
import ReportCardTitle from "./ReportCardTitle";
import ReportHeadline from "./ReportHeadline";
import ReportScroll from "./ReportScroll";

/** Revenue, payments by status, late payments and the last months. */
const PaymentReport = () => {
  const paymentReport = usePaymentReport();

  return (
    <DataLoader query={paymentReport} emptyMessage="No hay datos de pagos.">
      {(data, isRefetching, refetch) => (
        <ReportScroll isRefetching={isRefetching} refetch={refetch}>
          <ReportHeadline label="Ingresos totales · pagos aprobados" value={formatCurrency(data.totalRevenue)} />
          <ReportBreakdown
            title={plural(data.totalPayments, "pago", "pagos")}
            note={data.totalPayments === 1 ? "registrado" : "registrados"}
            parts={[
              { label: "Aprobados", value: data.approvedPayments, color: BREAKDOWN_COLOR.done },
              { label: "Pendientes", value: data.pendingPayments, color: BREAKDOWN_COLOR.waiting },
              { label: "Rechazados", value: data.rejectedPayments, color: BREAKDOWN_COLOR.notDone },
            ]}
          />
          <Card className="py-1.5">
            <InfoRow label="Pagos tardíos">{String(data.latePaymentsCount)}</InfoRow>
            <InfoRow label="Multas cobradas" divider={false}>
              {formatCurrency(data.latePaymentsRevenue)}
            </InfoRow>
          </Card>
          {data.paymentsByMonth.length > 0 && (
            <Card className="pb-1.5">
              <ReportCardTitle title="Por mes" />
              <View className="mt-1">
                {data.paymentsByMonth.map((item, index) => (
                  <InfoRow
                    key={item.month}
                    label={formatMonthLabel(item.month)}
                    divider={index < data.paymentsByMonth.length - 1}
                  >
                    {`${plural(item.count, "pago", "pagos")} · ${formatCurrency(item.amount)}`}
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

export default PaymentReport;
