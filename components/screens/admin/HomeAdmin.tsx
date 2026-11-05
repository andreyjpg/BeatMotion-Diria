import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import HomeHero from "@/components/ui/HomeHero";
import type { IconName } from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import SectionHeader from "@/components/ui/SectionHeader";
import ShortcutCard from "@/components/ui/ShortcutCard";
import { formatCurrency, formatShortDate, formatYYYYMMDD } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useActiveClasses } from "@/hooks/classes/useActiveClasses";
import { useEnrollmentCount } from "@/hooks/enrollment/useEnrollmentCount";
import { useEnrollmentsByStatus } from "@/hooks/enrollment/useEnrollmentsByStatus";
import { usePaymentCount } from "@/hooks/payment/usePaymentCount";
import { usePayments } from "@/hooks/payment/usePayments";
import { useUsers } from "@/hooks/user/useUsers";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Pressable, RefreshControl, View } from "react-native";

const SHORTCUTS: { label: string; sub: string; icon: IconName; route: Href }[] = [
  { label: "Cobros", sub: "Comprobantes", icon: "card-outline", route: "/private/payments" },
  { label: "Matrículas", sub: "Solicitudes", icon: "clipboard-outline", route: "/private/admin/enrollments/enrollmentList" },
  { label: "Usuarios", sub: "Estudiantes y roles", icon: "people-outline", route: "/private/users" },
  { label: "Cursos", sub: "Cursos y clases", icon: "book-outline", route: "/private/courses" },
  { label: "Eventos", sub: "Sociales y talleres", icon: "calendar-outline", route: "/private/admin/events" },
  { label: "Encuestas", sub: "Crear y resultados", icon: "checkbox-outline", route: "/private/admin/surveys/list" },
  { label: "Avisos", sub: "Enviar notificación", icon: "megaphone-outline", route: "/private/admin/notifications/notificationCenter" },
  { label: "Tienda", sub: "Artículos", icon: "bag-outline", route: "/private/marketplace/MarketplaceList" },
  { label: "Estadísticas", sub: "Resumen general", icon: "stats-chart-outline", route: "/private/admin/Dashboard" },
  { label: "Reportes", sub: "Pagos y asistencia", icon: "document-text-outline", route: "/private/admin/reports" },
  { label: "Sucursales", sub: "Sedes", icon: "business-outline", route: "/private/admin/branches" },
];

/** Admin home: what needs review today, at a glance. */
const HomeAdmin = () => {
  const router = useRouter();
  const paymentCount = usePaymentCount("pending");
  const enrollmentCount = useEnrollmentCount("pending");
  const paymentsQuery = usePayments("pending");
  const enrollmentsQuery = useEnrollmentsByStatus("pending");
  const usersQuery = useUsers();
  const classesQuery = useActiveClasses();

  const today = new Date();
  const todayKey = formatYYYYMMDD(today);
  const pendingPayments = paymentCount.data ?? 0;
  const pendingEnrollments = enrollmentCount.data ?? 0;
  const lateStudents = (usersQuery.data ?? []).filter(
    (u) => u.role === "user" && u.isActive && u.paymentStatus === "late",
  ).length;
  const classesToday = (classesQuery.data ?? []).filter((cls) => cls.date === todayKey).length;
  const toReview = pendingPayments + pendingEnrollments;

  // Late payments first: they've waited the longest.
  const topPayment = [...(paymentsQuery.data ?? [])].sort((a, b) => b.daysLate - a.daysLate)[0];
  const topEnrollment = enrollmentsQuery.data?.[0];
  const shown = (topPayment ? 1 : 0) + (topEnrollment ? 1 : 0);

  const stats: { n: number; label: string; alert?: boolean; route: Href }[] = [
    { n: pendingPayments, label: "Pagos", route: "/private/payments" },
    { n: pendingEnrollments, label: "Matrículas", route: "/private/admin/enrollments/enrollmentList" },
    { n: lateStudents, label: "Atrasados", alert: lateStudents > 0, route: "/private/users" },
    { n: classesToday, label: "Clases hoy", route: "/private/courses" },
  ];

  const refreshing = paymentCount.isRefetching || enrollmentCount.isRefetching;
  const refresh = () => {
    paymentCount.refetch();
    enrollmentCount.refetch();
    paymentsQuery.refetch();
    enrollmentsQuery.refetch();
    usersQuery.refetch();
    classesQuery.refetch();
  };

  return (
    <Screen inTabs refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <HomeHero
        eyebrow={`${formatShortDate(today)} · Administración`}
        title={
          toReview === 0
            ? "Todo al día"
            : toReview === 1
              ? "1 cosa te espera hoy"
              : `${toReview} cosas te esperan hoy`
        }
      >
        <View className="mt-5 flex-row border-t border-hero-line pt-3.5">
          {stats.map((s, i) => (
            <Pressable
              key={s.label}
              onPress={() => router.navigate(s.route)}
              accessibilityRole="button"
              accessibilityLabel={`${s.n} ${s.label}`}
              className={`flex-1 active:opacity-70 ${i > 0 ? "border-l border-hero-line pl-3" : ""}`}
            >
              <AppText
                variant="heavy"
                tone="inverse"
                className="text-[26px]"
                style={s.alert ? { color: palette.hero.alert } : undefined}
              >
                {s.n}
              </AppText>
              <AppText tone="hero-soft" className="text-[11.5px]" numberOfLines={1}>
                {s.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </HomeHero>

      <SectionHeader title="Pendiente hoy" action={{ label: "Ver todo", onPress: () => router.navigate("/private/payments") }} />
      <View className="gap-2.5 px-3">
        {shown === 0 && (
          <Card className="items-center gap-1 py-6">
            <Ionicons name="checkmark-circle-outline" size={28} color={palette.ink} />
            <AppText variant="bold" className="text-[15px]">
              Nada por revisar
            </AppText>
            <AppText tone="muted" className="text-[13px]">
              No hay comprobantes ni matrículas pendientes.
            </AppText>
          </Card>
        )}

        {topPayment && (
          <Card className="gap-3">
            <View className="flex-row items-center gap-1.5">
              {topPayment.isLate ? (
                <Chip label={`Atrasado ${topPayment.daysLate} d`} tone="late" />
              ) : (
                <Chip label="A tiempo" tone="line" />
              )}
              <Chip label={topPayment.annualFeeYear ? "+ Matrícula anual" : "Mensualidad"} tone="line" />
            </View>
            <View className="flex-row items-end justify-between gap-3">
              <View className="flex-1">
                <AppText variant="bold" className="text-[17px]" numberOfLines={1}>
                  {[topPayment.user?.name, topPayment.user?.lastName].filter(Boolean).join(" ") || "Estudiante"}
                </AppText>
                <AppText tone="muted" className="mt-0.5 text-[13.5px]" numberOfLines={1}>
                  {topPayment.courses.map((c) => c.title).join(" + ")}
                </AppText>
              </View>
              <AppText variant="heavy" className="text-[22px]">
                {formatCurrency(topPayment.totalAmount)}
              </AppText>
            </View>
            <Button label="Revisar comprobante" onPress={() => router.navigate("/private/payments")} />
          </Card>
        )}

        {topEnrollment && (
          <Card className="gap-3">
            <View className="flex-row items-center gap-2">
              <Chip label="Matrícula" tone="pending" />
              <AppText variant="label" tone="muted" className="text-[10.5px]">
                {formatShortDate(topEnrollment.submittedAt)}
              </AppText>
            </View>
            <View className="flex-row items-end justify-between gap-3">
              <View className="flex-1">
                <AppText variant="bold" className="text-[17px]" numberOfLines={1}>
                  {[topEnrollment.user?.name, topEnrollment.user?.lastName].filter(Boolean).join(" ") || "Estudiante"}
                </AppText>
                <AppText tone="muted" className="mt-0.5 text-[13.5px]" numberOfLines={1}>
                  {`${topEnrollment.courses.length === 1 ? "1 curso" : `${topEnrollment.courses.length} cursos`} · ${topEnrollment.courses
                    .map((c) => c.title)
                    .join(" + ")}`}
                </AppText>
              </View>
              <AppText variant="heavy" className="text-[22px]">
                {formatCurrency(topEnrollment.totalAmount)}
              </AppText>
            </View>
            <Button
              label="Revisar solicitud"
              variant="secondary"
              onPress={() => router.push("/private/admin/enrollments/enrollmentList")}
            />
          </Card>
        )}

        {toReview > shown && (
          <Card
            onPress={() => router.navigate("/private/payments")}
            className="flex-row items-center justify-between px-4 py-3.5"
          >
            <AppText variant="semibold" className="text-[14px]">
              {`${toReview - shown} más entre cobros y matrículas`}
            </AppText>
            <Ionicons name="chevron-forward" size={18} color={palette.ink} />
          </Card>
        )}
      </View>

      <SectionHeader title="Accesos" />
      <View className="flex-row flex-wrap justify-between gap-y-2.5 px-3">
        {SHORTCUTS.map((s) => (
          <ShortcutCard key={s.label} label={s.label} sub={s.sub} icon={s.icon} onPress={() => router.push(s.route)} />
        ))}
      </View>
    </Screen>
  );
};

export default HomeAdmin;
