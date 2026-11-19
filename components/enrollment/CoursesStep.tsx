import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Pill from "@/components/ui/Pill";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatCourseSchedule, formatCurrency, monthlyFareFor, planName } from "@/constants/helpers";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCoursesAvailable } from "@/hooks/courses/useCoursesAvailable";
import { useFares } from "@/hooks/fares/useFares";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import StepBar from "./StepBar";

const PLANS = [
  { courses: 1, label: "1 curso" },
  { courses: 2, label: "2 cursos" },
  { courses: 3, label: "3 o más" },
];

const AmountLine = ({ label, amount }: { label: string; amount: number }) => (
  <View className="flex-row justify-between gap-3">
    <AppText tone="muted" className="flex-1 text-[14px]">
      {label}
    </AppText>
    <AppText className="text-[14px]">{formatCurrency(amount)}</AppText>
  </View>
);

type CoursesStepProps = {
  /** Courses the student is in or already asked for. */
  enrolledCourseIds: string[];
  selected: string[];
  onToggle: (courseId: string) => void;
  /** What the month costs with this selection (the difference, if already enrolled). */
  coursesAmount: number;
  /** Zero when it isn't due. */
  annualAmount: number;
  total: number;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
};

/** Step 2: the plans, the courses to choose from and the price as it adds up. */
const CoursesStep = ({
  enrolledCourseIds,
  selected,
  onToggle,
  coursesAmount,
  annualAmount,
  total,
  canContinue,
  onBack,
  onContinue,
}: CoursesStepProps) => {
  const coursesQuery = useCoursesAvailable();
  const branchesQuery = useBranches();
  const faresQuery = useFares();
  const [branchId, setBranchId] = useState<string | null>(null);

  const branches = branchesQuery.data ?? [];
  const courseCount = enrolledCourseIds.length + selected.length;
  const faresFailed = faresQuery.isFetched && (faresQuery.data?.length ?? 0) === 0;
  const alreadyIn = (coursesQuery.data ?? []).filter((course) => enrolledCourseIds.includes(course.id));

  const monthlyLabel = selected.length === 0
    ? "Mensualidad"
    : `${enrolledCourseIds.length > 0 ? "Cambio a" : "Mensualidad ·"} ${planName(courseCount)}`;

  return (
    <Screen
      footer={
        <View className="gap-1.5">
          <AmountLine label={monthlyLabel} amount={coursesAmount} />
          {annualAmount > 0 && <AmountLine label="Matrícula anual" amount={annualAmount} />}
          <View className="mt-0.5 flex-row items-baseline justify-between border-t border-line-soft pt-2">
            <AppText variant="bold" className="text-[15px]">
              Total a pagar
            </AppText>
            <AppText variant="heavy" className="text-[26px] leading-[30px]">
              {formatCurrency(total)}
            </AppText>
          </View>
          <Button
            label={total > 0 ? "Continuar al pago" : "Continuar"}
            onPress={onContinue}
            disabled={!canContinue}
            className="mt-2"
          />
        </View>
      }
    >
      <ScreenHeader
        onNav={onBack}
        eyebrow="Matrícula · paso 2 de 3"
        belowBar={<StepBar step={2} />}
        title="Elige tus cursos"
        subtitle="Mientras más cursos llevas, menos pagas por cada uno."
      />

      <View className="mx-3 mt-3.5 rounded-[18px] bg-surface p-2">
        <View className="flex-row gap-1">
          {PLANS.map((plan) => {
            const isCurrent = Math.min(courseCount, 3) === plan.courses;
            const tone = isCurrent ? "inverse" : "ink";
            return (
              <View
                key={plan.courses}
                className={`flex-1 items-center gap-0.5 rounded-[10px] py-2 ${isCurrent ? "bg-ink" : "bg-surface"}`}
              >
                <AppText variant="label" tone={isCurrent ? "hero-soft" : "muted"} className="text-[9.5px]">
                  {plan.label}
                </AppText>
                <AppText variant="semibold" tone={tone} className="text-[12.5px]">
                  {planName(plan.courses)}
                </AppText>
                <AppText variant="heavy" tone={tone} className="text-[14px]">
                  {formatCurrency(monthlyFareFor(faresQuery.data, plan.courses))}
                </AppText>
              </View>
            );
          })}
        </View>
        <AppText tone="muted" className="px-1.5 pt-2 text-center text-[12.5px]">
          Con 3 o más cursos, las clases son ilimitadas.
        </AppText>
      </View>

      {faresFailed && (
        <AppText tone="danger" className="mx-5 mt-3 text-[14px] leading-[20px]">
          No se pudieron cargar las tarifas. Intenta más tarde o contacta a la academia.
        </AppText>
      )}

      {alreadyIn.length > 0 && (
        <AppText tone="muted" className="mx-5 mt-3 text-[13.5px] leading-[19px]">
          {`Ya estás en: ${alreadyIn.map((course) => course.title).join(", ")}.`}
        </AppText>
      )}

      {branches.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          accessibilityLabel="Filtrar por sede"
          className="mt-3.5"
          contentContainerClassName="gap-2 px-5"
        >
          <Pill label="Todas las sedes" selected={branchId === null} onPress={() => setBranchId(null)} />
          {branches.map((branch) => (
            <Pill
              key={branch.id}
              label={branch.name}
              selected={branchId === branch.id}
              onPress={() => setBranchId(branch.id)}
            />
          ))}
        </ScrollView>
      )}

      <DataLoader query={coursesQuery} emptyMessage="No hay cursos disponibles.">
        {(courses) => {
          const shown = courses.filter(
            (course) =>
              !enrolledCourseIds.includes(course.id) &&
              branches.some((branch) => branch.id === course.branchId) &&
              (branchId === null || course.branchId === branchId),
          );
          return (
            <View className="gap-2 px-3 pt-3">
              {shown.length === 0 && (
                <AppText tone="faint" className="px-2 py-6 text-center text-[14.5px]">
                  No hay más cursos disponibles aquí.
                </AppText>
              )}
              {shown.map((course) => {
                const isSelected = selected.includes(course.id);
                return (
                  <Checkbox
                    key={course.id}
                    checked={isSelected}
                    onChange={() => onToggle(course.id)}
                    accessibilityLabel={course.title}
                    className={`rounded-2xl border-2 bg-surface p-3.5 ${isSelected ? "border-ink" : "border-surface"}`}
                  >
                    <View className="gap-0.5">
                      <View className="flex-row items-baseline justify-between gap-2">
                        <AppText variant="bold" className="flex-1 text-[16px]">
                          {course.title}
                        </AppText>
                        <AppText variant="label" tone="muted" className="text-[10px]">
                          {branches.find((branch) => branch.id === course.branchId)?.name}
                        </AppText>
                      </View>
                      <AppText className="text-[13.5px]">
                        {[formatCourseSchedule(course.day, course.startTime, course.endTime), `Nivel ${course.level}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </AppText>
                      <AppText tone="muted" className="text-[12.5px]">
                        {course.teacher}
                      </AppText>
                      {!!course.description && (
                        <AppText tone="muted" className="mt-0.5 text-[12.5px] leading-[17px]" numberOfLines={2}>
                          {course.description}
                        </AppText>
                      )}
                    </View>
                  </Checkbox>
                );
              })}
            </View>
          );
        }}
      </DataLoader>
    </Screen>
  );
};

export default CoursesStep;
