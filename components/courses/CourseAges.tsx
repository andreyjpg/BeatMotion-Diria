import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import { AGE_GROUPS, type AgeGroup, type AgeSummary, withoutBirthDateNote } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { View } from "react-native";

type AgeGroups = AgeSummary["groups"];

/**
 * "stacked": one bar split by group, with a legend (teacher).
 * "rows": a bar per group with its count, and the age range by the average (admin).
 */
type AgeChart = "stacked" | "rows";

type CourseAgesProps = {
  /** "Edades del grupo" (teacher) or "Edades en el curso" (admin). */
  title: string;
  /** The course's current students (toCourseAges); undefined while they load. */
  ages: AgeSummary | undefined;
  chart: AgeChart;
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

/**
 * "Promedio 27", plus " · de 16 a 52" with `showRange`; "Promedio —" without
 * ages or while they load.
 */
const averageNote = (ages: AgeSummary | undefined, showRange: boolean) => {
  if (!ages || ages.averageAge === null) return "Promedio —";
  const { averageAge, youngestAge, oldestAge } = ages;
  const hasRange = showRange && youngestAge !== null && oldestAge !== null && youngestAge !== oldestAge;
  return hasRange ? `Promedio ${averageAge} · de ${youngestAge} a ${oldestAge}` : `Promedio ${averageAge}`;
};

/**
 * One bar whose segments are the groups, sized by how many students each has.
 * Groups without students are left out of the bar and its legend.
 */
const StackedAgeBar = ({ groups }: { groups: AgeGroups }) => {
  const groupsWithStudents = groups.filter((group) => group.count > 0);
  return (
    <>
      <View
        className="h-3.5 flex-row gap-0.5 overflow-hidden rounded-[5px]"
        accessible
        accessibilityRole="image"
        accessibilityLabel={spokenCounts(groupsWithStudents)}
      >
        {groupsWithStudents.map((group) => (
          <View key={group.key} style={{ flex: group.count, backgroundColor: GROUP_COLOR[group.key] }} />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-x-3 gap-y-1">
        {groupsWithStudents.map((group) => (
          <View key={group.key} className="flex-row items-center gap-[5px]">
            <View className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: GROUP_COLOR[group.key] }} />
            <AppText className="text-[12px]">{`${group.label} · ${group.count}`}</AppText>
          </View>
        ))}
      </View>
    </>
  );
};

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
 * Room the chart takes while the students load, so the card barely changes
 * size when it arrives: an empty bar and a legend line, or a row per group.
 * The blank texts are as tall as the legend and the counts.
 */
const ChartPlaceholder = ({ chart }: { chart: AgeChart }) => (
  <View className="gap-2.5" accessible accessibilityLabel="Cargando edades">
    {chart === "stacked" ? (
      <>
        <View className="h-3.5 rounded-[5px] bg-ground" />
        <AppText className="text-[12px]"> </AppText>
      </>
    ) : (
      AGE_GROUPS.map((group) => (
        <View key={group.key} className="flex-row items-center gap-2.5">
          <AppText variant="label" tone="muted" className="w-14 text-[10.5px]">
            {group.label}
          </AppText>
          <View className="h-3.5 flex-1 rounded bg-ground" />
          <AppText variant="bold" className="w-6 text-[13px]"> </AppText>
        </View>
      ))
    )}
  </View>
);

/** The chart, with the line about students left out of it; a message when nobody has a birth date. */
const AgesChart = ({ ages, chart }: { ages: AgeSummary; chart: AgeChart }) => {
  const hasAges = ages.groups.some((group) => group.count > 0);
  if (!hasAges) {
    return (
      <AppText tone="muted" className="text-[13.5px]">
        {NO_AGES_MESSAGE}
      </AppText>
    );
  }
  const missingNote = withoutBirthDateNote(ages.withoutBirthDate);
  const Chart = chart === "stacked" ? StackedAgeBar : AgeRows;
  return (
    <>
      <Chart groups={ages.groups} />
      {missingNote && (
        <AppText tone="muted" className="text-[12px]">
          {missingNote}
        </AppText>
      )}
    </>
  );
};

/**
 * Age mix of a course's students on the course screens. Students without a
 * birth date are left out of the chart and counted in a line under it; with
 * nobody to chart it shows a message instead. While the students load it
 * keeps the chart's place.
 */
const CourseAges = ({ title, ages, chart }: CourseAgesProps) => (
  <Card className="mx-3 mt-2.5 gap-2.5">
    <View className="flex-row flex-wrap items-center justify-between gap-2">
      <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
        {title}
      </AppText>
      <AppText tone="muted" className="text-[12.5px]">
        {averageNote(ages, chart === "rows")}
      </AppText>
    </View>
    {ages ? <AgesChart ages={ages} chart={chart} /> : <ChartPlaceholder chart={chart} />}
  </Card>
);

export default CourseAges;
