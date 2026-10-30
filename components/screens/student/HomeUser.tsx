import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip, { type ChipTone } from "@/components/ui/Chip";
import HomeHero from "@/components/ui/HomeHero";
import Screen from "@/components/ui/Screen";
import SectionHeader from "@/components/ui/SectionHeader";
import ShortcutCard from "@/components/ui/ShortcutCard";
import {
  formatCurrency,
  formatShortDate,
  formatYYYYMMDD,
  hhmmTo12h,
  lateFeeFor,
  monthlyFareFor,
  parseLocalDate,
  shortDayName,
} from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useBranches } from "@/hooks/branches/useBranches";
import { useActiveClasses } from "@/hooks/classes/useActiveClasses";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import { useAnnualFeeDue } from "@/hooks/payment/useAnnualFeeDue";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";

const SHORTCUTS: { label: string; sub: string; icon: "add" | "checkbox-outline" | "calendar-outline" | "bag-outline"; route: Href }[] = [
  { label: "Matricular", sub: "Agregar un curso", icon: "add", route: "/private/user/enrollment/createEnrollment" },
  { label: "Encuestas", sub: "Tu opinión cuenta", icon: "checkbox-outline", route: "/private/user/surveys/list" },
  { label: "Eventos", sub: "Sociales y talleres", icon: "calendar-outline", route: "/private/user/events" },
  { label: "Tienda", sub: "Ropa y accesorios", icon: "bag-outline", route: "/private/marketplace/MarketplaceList" },
];

/** Student home: today's class, the monthly payment and shortcuts. */
const HomeUser = () => {
  const router = useRouter();
  const { user } = useActiveUser();
  const coursesQuery = useCoursesByUserMember(user?.uid ?? "");
  const classesQuery = useActiveClasses();
  const paymentsQuery = usePaymentsByUser(user?.uid);
  const annualFeeQuery = useAnnualFeeDue(user?.uid);
  const faresQuery = useFares();
  const branchesQuery = useBranches();

  const courses = coursesQuery.data ?? [];
  const today = new Date();
  const todayKey = formatYYYYMMDD(today);
  const dateLabel = formatShortDate(today);

  const refreshing = coursesQuery.isRefetching || paymentsQuery.isRefetching;
  const refresh = () => {
    coursesQuery.refetch();
    paymentsQuery.refetch();
    classesQuery.refetch();
  };

  if (coursesQuery.isLoading) {
    return (
      <Screen scroll={false} inTabs>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={palette.faint} />
        </View>
      </Screen>
    );
  }

  // ---- Not enrolled yet -------------------------------------------------------
  if (courses.length === 0) {
    return (
      <Screen inTabs refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <HomeHero
          eyebrow={dateLabel}
          title={`Hola, ${user?.name ?? ""}`.trim()}
          subtitle="Todavía no tienes cursos. Matricúlate y empieza a bailar."
        >
          <Button
            label="Matricular mi primer curso"
            icon="add"
            variant="inverse"
            className="mt-5"
            onPress={() => router.push("/private/user/enrollment/createEnrollment")}
          />
        </HomeHero>

        <SectionHeader title="Cómo matricularte" />
        <Card className="mx-3 py-1.5">
          {[
            { title: "Elige tus cursos", sub: "Ves el precio al instante" },
            { title: "Transfiere y sube el comprobante", sub: "Desde la misma pantalla" },
            { title: "La academia lo revisa", sub: "Te avisamos cuando quede aprobada" },
          ].map((step, i, all) => (
            <View
              key={step.title}
              className={`flex-row items-center gap-3 py-3 ${i < all.length - 1 ? "border-b border-line-soft" : ""}`}
            >
              <View className="h-7 w-7 items-center justify-center rounded-full bg-ink">
                <AppText variant="label-bold" tone="inverse" className="text-[12px]">
                  {i + 1}
                </AppText>
              </View>
              <View className="flex-1">
                <AppText variant="bold" className="text-[15px]">
                  {step.title}
                </AppText>
                <AppText tone="muted" className="text-[13px]">
                  {step.sub}
                </AppText>
              </View>
            </View>
          ))}
        </Card>

        <SectionHeader title="Accesos" />
        <View className="flex-row flex-wrap justify-between gap-y-2.5 px-3">
          {SHORTCUTS.slice(2).map((s) => (
            <ShortcutCard key={s.label} label={s.label} sub={s.sub} icon={s.icon} onPress={() => router.push(s.route)} />
          ))}
        </View>
      </Screen>
    );
  }

  // ---- Enrolled -----------------------------------------------------------------
  const myCourseIds = new Set(courses.map((c) => c.courseId));
  const myClasses = (classesQuery.data ?? []).filter((cls) => myCourseIds.has(cls.courseId) && cls.date);
  const todayClass = myClasses
    .filter((cls) => cls.date === todayKey)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))[0];
  const nextClass = todayClass ? undefined : myClasses.find((cls) => (cls.date ?? "") > todayKey);
  const courseTitle = (courseId: string) => courses.find((c) => c.courseId === courseId)?.title ?? "";

  // Same total as the payment screen: monthly fare + late fee + annual fee when due.
  const dueDate =
    courses
      .map((course) => course.nextPaymentDate)
      .filter((date): date is Date => date instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const owes = courses.some((course) => course.paymentStatus !== "ok");
  const isLate = courses.some((course) => course.paymentStatus === "late");
  const inReview = paymentsQuery.data?.some((payment) => payment.status === "pending") ?? false;
  const annualFare = faresQuery.data?.find((f) => f.type === "annual")?.fare ?? 0;
  const total =
    monthlyFareFor(faresQuery.data, courses.length) +
    lateFeeFor(faresQuery.data, dueDate).amount +
    (annualFeeQuery.data ? annualFare : 0);

  const payment: { label: string; tone: ChipTone; text: string } = inReview
    ? { label: "En revisión", tone: "pending", text: "Recibimos tu comprobante y lo estamos revisando." }
    : isLate
      ? { label: "Atrasado", tone: "late", text: dueDate ? `Venció el ${formatShortDate(dueDate).toLowerCase()}` : "Pago atrasado" }
      : owes
        ? { label: "Pendiente", tone: "pending", text: dueDate ? `Vence el ${formatShortDate(dueDate).toLowerCase()}` : "Pago pendiente" }
        : { label: "Al día", tone: "ok", text: dueDate ? `Próximo pago el ${formatShortDate(dueDate).toLowerCase()}` : "No debes nada" };
  const mustPay = owes && !inReview;

  return (
    <Screen inTabs refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      {todayClass ? (
        <HomeHero
          eyebrow={`${dateLabel} · Hoy`}
          title={`${courseTitle(todayClass.courseId)}${todayClass.startTime ? `\na las ${hhmmTo12h(todayClass.startTime)}` : ""}`}
          subtitle={[todayClass.title, todayClass.endTime && `hasta ${hhmmTo12h(todayClass.endTime)}`].filter(Boolean).join(" · ")}
        >
          <Button
            label="¿Vas a asistir? Responde"
            variant="inverse"
            className="mt-5"
            onPress={() =>
              router.push({
                pathname: "/private/user/attendance/rsvp",
                params: {
                  classId: todayClass.id,
                  courseId: todayClass.courseId,
                  courseTitle: courseTitle(todayClass.courseId),
                },
              })
            }
          />
        </HomeHero>
      ) : (
        <HomeHero
          eyebrow={dateLabel}
          title={`Hola, ${user?.name ?? ""}`.trim()}
          subtitle={
            nextClass?.date
              ? `Hoy no tienes clase. La próxima: ${courseTitle(nextClass.courseId)}, ${formatShortDate(
                  parseLocalDate(nextClass.date) ?? today,
                ).toLowerCase()}${nextClass.startTime ? ` a las ${hhmmTo12h(nextClass.startTime)}` : ""}.`
              : "Hoy no tienes clase."
          }
        />
      )}

      <SectionHeader title="Mensualidad" action={{ label: "Historial", onPress: () => router.navigate("/private/payments") }} />
      <Card className="mx-3 gap-3">
        <View className="flex-row items-center gap-2">
          <Chip label={payment.label} tone={payment.tone} />
          <AppText variant="label" tone="muted" className="flex-1 text-[10.5px]" numberOfLines={1}>
            {payment.text}
          </AppText>
        </View>
        <View className="flex-row items-end justify-between gap-3">
          <View className="flex-1">
            <AppText variant="bold" className="text-[16px]">
              {courses.length === 1 ? "1 curso este mes" : `${courses.length} cursos este mes`}
            </AppText>
            <AppText tone="muted" className="mt-0.5 text-[13.5px]" numberOfLines={1}>
              {courses.map((c) => c.title).join(" + ")}
            </AppText>
          </View>
          {mustPay && faresQuery.isSuccess && (
            <AppText variant="heavy" className="text-[24px]">
              {formatCurrency(total)}
            </AppText>
          )}
        </View>
        <Button
          label={mustPay ? "Pagar mensualidad" : "Ver mis pagos"}
          variant={mustPay ? "primary" : "secondary"}
          onPress={() => router.navigate("/private/payments")}
        />
      </Card>

      <SectionHeader title="Mis cursos" action={{ label: "Ver todos", onPress: () => router.navigate("/private/courses") }} />
      <View className="gap-2.5 px-3">
        {courses.slice(0, 2).map((course) => {
          const branch = branchesQuery.data?.find((b) => b.id === course.branchId);
          return (
            <Pressable
              key={course.id}
              onPress={() => router.push({ pathname: "/private/user/course/[courseId]", params: { courseId: course.courseId } })}
              accessibilityRole="button"
              accessibilityLabel={course.title}
              className="flex-row items-center gap-3.5 rounded-[18px] bg-surface px-4 py-3.5 active:opacity-80"
            >
              <View className="h-[52px] w-12 items-center justify-center rounded-xl bg-ink">
                <AppText variant="label-bold" tone="inverse" className="text-[12px]">
                  {shortDayName(course.day) || "—"}
                </AppText>
              </View>
              <View className="flex-1">
                <AppText variant="bold" className="text-[16px]" numberOfLines={1}>
                  {course.title}
                </AppText>
                <AppText tone="muted" className="text-[13px]" numberOfLines={1}>
                  {[branch?.name, course.teacher].filter(Boolean).join(" · ")}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.ink} />
            </Pressable>
          );
        })}
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

export default HomeUser;
