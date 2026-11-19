import ConoceDiriaCardMock from "@/components/mocks/ConoceDiriaCardMock";
import MonthlyFeeCard from "@/components/payments/MonthlyFeeCard";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import HomeHero from "@/components/ui/HomeHero";
import Screen from "@/components/ui/Screen";
import SectionHeader from "@/components/ui/SectionHeader";
import ShortcutCard from "@/components/ui/ShortcutCard";
import { SHOW_FEATURE_MOCKS } from "@/constants/featureMocks";
import {
  formatDayMonth,
  formatShortDate,
  formatYYYYMMDD,
  hhmmTo12h,
  parseLocalDate,
  shortDayName,
} from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useBranches } from "@/hooks/branches/useBranches";
import { useActiveClasses } from "@/hooks/classes/useActiveClasses";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { activePauseOf } from "@/hooks/membership/membershipRules";
import { useMembershipChanges } from "@/hooks/membership/useMembershipChanges";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";

const ENROLL_ROUTE: Href = "/private/user/enrollment/createEnrollment";

const SHORTCUTS: { label: string; sub: string; icon: "add" | "checkbox-outline" | "calendar-outline" | "bag-outline"; route: Href }[] = [
  { label: "Matricular", sub: "Agregar un curso", icon: "add", route: ENROLL_ROUTE },
  { label: "Encuestas", sub: "Tu opinión cuenta", icon: "checkbox-outline", route: "/private/user/surveys/list" },
  { label: "Eventos", sub: "Sociales y talleres", icon: "calendar-outline", route: "/private/user/events" },
  { label: "Tienda", sub: "Ropa y accesorios", icon: "bag-outline", route: "/private/marketplace/MarketplaceList" },
];

/** What the "Matricular" shortcut says while paused: enrolling waits for the pause to end. */
const ENROLL_WHILE_PAUSED_SUB = "Al terminar la pausa";

/** "Tus 3 cursos te esperan." on the paused hero. */
const pausedSubtitle = (courseCount: number) =>
  `${courseCount === 1 ? "Tu curso te espera" : `Tus ${courseCount} cursos te esperan`}. No tienes que matricularte de nuevo.`;

/** Student home: today's class (or the pause), the monthly payment and shortcuts. */
const HomeUser = () => {
  const router = useRouter();
  const { user } = useActiveUser();
  const coursesQuery = useCoursesByUserMember(user?.uid ?? "");
  const changesQuery = useMembershipChanges(user?.uid);
  const classesQuery = useActiveClasses();
  const paymentsQuery = usePaymentsByUser(user?.uid);
  const branchesQuery = useBranches();

  const courses = coursesQuery.data ?? [];
  const today = new Date();
  const todayKey = formatYYYYMMDD(today);
  const dateLabel = formatShortDate(today);

  const refreshing = coursesQuery.isRefetching || paymentsQuery.isRefetching;
  const refresh = () => {
    coursesQuery.refetch();
    changesQuery.refetch();
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
          subtitle="Todavía no tienes cursos. Matricúlate en tres pasos y empieza a bailar."
        >
          <Button
            label="Matricular mi primer curso"
            icon="add"
            variant="inverse"
            className="mt-5"
            onPress={() => router.push("/private/user/enrollment/createEnrollment")}
          />
        </HomeHero>

        {SHOW_FEATURE_MOCKS && <ConoceDiriaCardMock />}

        <SectionHeader title="Cómo matricularte" />
        <Card className="mx-3 py-1.5">
          {[
            { title: "Lee las reglas", sub: "Pagos, ausencias y reposiciones" },
            { title: "Elige tus cursos", sub: "Ves el precio al instante" },
            { title: "Transfiere y sube el comprobante", sub: "La academia lo revisa y te confirma" },
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

  // While paused there's no class to answer: the hero says until when, and how to come back.
  const activePause = activePauseOf(changesQuery.data);
  const pausedHero = activePause?.endDate ? (
    <HomeHero
      eyebrow="Membresía en pausa"
      title={`En pausa hasta\nel ${formatDayMonth(activePause.endDate)}`}
      subtitle={pausedSubtitle(courses.length)}
    >
      <Button
        label="Volver antes"
        variant="inverse"
        className="mt-5"
        onPress={() => router.push("/private/user/membership")}
      />
    </HomeHero>
  ) : null;

  const classHero = todayClass ? (
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
  );

  return (
    <Screen inTabs refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      {pausedHero ?? classHero}

      <SectionHeader title="Mensualidad" action={{ label: "Historial", onPress: () => router.navigate("/private/payments") }} />
      <MonthlyFeeCard userId={user?.uid ?? ""} courses={courses} />

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
              {/* In a View: Chip is self-start, which would pin it to the top of the row. */}
              {course.pausedUntil && (
                <View>
                  <Chip label="En pausa" tone="muted" />
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={palette.ink} />
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Accesos" />
      <View className="flex-row flex-wrap justify-between gap-y-2.5 px-3">
        {SHORTCUTS.map((s) => (
          <ShortcutCard
            key={s.label}
            label={s.label}
            sub={activePause && s.route === ENROLL_ROUTE ? ENROLL_WHILE_PAUSED_SUB : s.sub}
            icon={s.icon}
            onPress={() => router.push(s.route)}
          />
        ))}
      </View>
    </Screen>
  );
};

export default HomeUser;
