import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import { type AgeGroup, type AgeSummary, withoutBirthDateNote } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { View } from "react-native";

type AgeGroups = AgeSummary["groups"];

type CourseAgesProps = {
  /** "Edades del grupo" (teacher) or "Edades en el curso" (admin). */
  title: string;
  /** The course's current students (toCourseAges). */
  ages: AgeSummary;
  /**
   * "stacked": one bar split by group, with a legend (teacher).
   * "rows": a bar per group with its count, and the age range by the average (admin).
   */
  chart: "stacked" | "rows";
};

const NO_AGES_MESSAGE = "Aún no hay estudiantes con fecha de nacimiento.";

// Fill of each group in the stacked bar and its legend (a style value, like
// ReportBreakdown's parts, because it depends on the data).
const GROUP_COLOR: Record<AgeGroup["key"], string> = {
  under18: palette.sand.strong,
  "18to25": palette.ink,
  "26to35": palette.neutral.ink,
  "36to45": palette.faint,
  "46plus": palette.line.strong,
};

/** "2 menores de 18, 6 de 18 a 25, …" for screen readers. */
const spokenCounts = (groups: AgeGroups) => groups.map((group) => `${group.count} ${group.spokenLabel}`).join(", ");

/** "Promedio 27", plus " · de 16 a 52" with `showRange`; "Promedio —" without ages. */
const averageNote = (ages: AgeSummary, showRange: boolean) => {
  const { averageAge, youngestAge, oldestAge } = ages;
  if (averageAge === null) return "Promedio —";
  const hasRange = showRange && youngestAge !== null && oldestAge !== null && youngestAge !== oldestAge;
  return hasRange ? `Promedio ${averageAge} · de ${youngestAge} a ${oldestAge}` : `Promedio ${averageAge}`;
};

/** One bar whose segments are the groups, sized by how many students each has. */
const StackedAgeBar = ({ groups }: { groups: AgeGroups }) => (
  <>
    <View
      className="h-3.5 flex-row gap-0.5 overflow-hidden rounded-[5px]"
      accessible
      accessibilityRole="image"
      accessibilityLabel={spokenCounts(groups)}
    >
      {groups
        .filter((group) => group.count > 0)
        .map((group) => (
          <View key={group.key} style={{ flex: group.count, backgroundColor: GROUP_COLOR[group.key] }} />
        ))}
    </View>
    <View className="flex-row flex-wrap gap-x-3 gap-y-1">
      {groups.map((group) => (
        <View key={group.key} className="flex-row items-center gap-[5px]">
          <View className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: GROUP_COLOR[group.key] }} />
          <AppText className="text-[12px]">{`${group.label} · ${group.count}`}</AppText>
        </View>
      ))}
    </View>
  </>
);

/** A bar per group, as long as its count compared with the largest group's. */
const AgeRows = ({ groups }: { groups: AgeGroups }) => {
  const largestCount = Math.max(...groups.map((group) => group.count));
  return (
    <>
      {groups.map((group) => (
        <View
          key={group.key}
          className="flex-row items-center gap-2.5"
          accessible
          accessibilityLabel={`${group.count} ${group.spokenLabel}`}
        >
          <AppText variant="label" tone="muted" className="w-14 text-[10.5px]">
            {group.label}
          </AppText>
          <View className="h-3.5 flex-1 overflow-hidden rounded bg-ground">
            <View
              className="h-full rounded bg-ink"
              style={{ width: `${Math.round((group.count / largestCount) * 100)}%` }}
            />
          </View>
          <AppText variant="bold" className="w-6 text-right text-[13px]" style={{ fontVariant: ["tabular-nums"] }}>
            {group.count}
          </AppText>
        </View>
      ))}
    </>
  );
};

/**
 * Age mix of a course's students on the course screens. Students without a
 * birth date are left out of the chart and counted in a line under it; with
 * nobody to chart it shows a message instead.
 */
const CourseAges = ({ title, ages, chart }: CourseAgesProps) => {
  const hasAges = ages.groups.some((group) => group.count > 0);
  const missingNote = withoutBirthDateNote(ages.withoutBirthDate);
  const Chart = chart === "stacked" ? StackedAgeBar : AgeRows;

  return (
    <Card className="mx-3 mt-2.5 gap-2.5">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          {title}
        </AppText>
        <AppText tone="muted" className="text-[12.5px]">
          {averageNote(ages, chart === "rows")}
        </AppText>
      </View>
      {hasAges ? (
        <>
          <Chart groups={ages.groups} />
          {missingNote && (
            <AppText tone="muted" className="text-[12px]">
              {missingNote}
            </AppText>
          )}
        </>
      ) : (
        <AppText tone="muted" className="text-[13.5px]">
          {NO_AGES_MESSAGE}
        </AppText>
      )}
    </Card>
  );
};

export default CourseAges;
