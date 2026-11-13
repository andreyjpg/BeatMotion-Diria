import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import { type AgeSummary, withoutBirthDateNote } from "@/constants/helpers";
import { type UseQueryResult } from "@tanstack/react-query";
import { View } from "react-native";

type AgeGroups = AgeSummary["groups"];

type AcademyAgesProps = {
  /** useAgeReport, called by the screen so that pulling to refresh reloads it too. */
  report: UseQueryResult<AgeSummary>;
};

const NO_AGES_MESSAGE = "Aún no hay estudiantes con fecha de nacimiento.";

// Column heights in px: the largest group's column is the tallest, and a group
// with someone in it never looks empty.
const TALLEST_COLUMN = 80;
const SHORTEST_COLUMN = 2;

/** "Promedio 29"; "Promedio —" without ages. */
const averageLabel = (averageAge: number | null) => `Promedio ${averageAge ?? "—"}`;

/** "31 menores de 18, 84 de 18 a 25, …" for screen readers. */
const spokenCounts = (groups: AgeGroups) => groups.map((group) => `${group.count} ${group.spokenLabel}`).join(", ");

/** A column per group with its count on top, as tall as its count compared with the largest group's. */
const AgeColumns = ({ groups }: { groups: AgeGroups }) => {
  const largestCount = Math.max(...groups.map((group) => group.count));
  const columnHeight = (count: number) =>
    count === 0 ? 0 : Math.max(SHORTEST_COLUMN, Math.round((count / largestCount) * TALLEST_COLUMN));

  return (
    <>
      <View
        className="h-[110px] flex-row items-end gap-2"
        accessible
        accessibilityRole="image"
        accessibilityLabel={spokenCounts(groups)}
      >
        {groups.map((group) => (
          <View key={group.key} className="flex-1 items-center gap-1">
            <AppText variant="bold" className="text-[12px]">
              {group.count}
            </AppText>
            <View className="w-full rounded-t-md bg-ink" style={{ height: columnHeight(group.count) }} />
          </View>
        ))}
      </View>
      <View className="flex-row gap-2">
        {groups.map((group) => (
          <AppText key={group.key} variant="label" tone="muted" className="flex-1 text-center text-[9.5px] tracking-normal">
            {group.label}
          </AppText>
        ))}
      </View>
    </>
  );
};

/** The chart and a line with the students it leaves out, or a message when nobody has a birth date. */
const AcademyAgesChart = ({ ages }: { ages: AgeSummary }) => {
  const hasAges = ages.groups.some((group) => group.count > 0);
  const missingNote = withoutBirthDateNote(ages.withoutBirthDate);

  if (!hasAges) {
    return (
      <AppText tone="muted" className="text-[13.5px]">
        {NO_AGES_MESSAGE}
      </AppText>
    );
  }

  return (
    <>
      <AgeColumns groups={ages.groups} />
      {missingNote && (
        <AppText tone="muted" className="text-[12.5px]">
          {missingNote}
        </AppText>
      )}
    </>
  );
};

/**
 * Admin's Estadísticas: the active students per age group and their average
 * age. Students without a birth date are left out of the chart and counted in
 * a line under it.
 */
const AcademyAges = ({ report }: AcademyAgesProps) => (
  <Card className="mx-3 mt-2.5 gap-2.5">
    <View className="flex-row flex-wrap items-center justify-between gap-2">
      <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
        Edades en la academia
      </AppText>
      {report.data && (
        <AppText tone="muted" className="text-[12.5px]">
          {averageLabel(report.data.averageAge)}
        </AppText>
      )}
    </View>
    <DataLoader query={report}>{(ages) => <AcademyAgesChart ages={ages} />}</DataLoader>
  </Card>
);

export default AcademyAges;
