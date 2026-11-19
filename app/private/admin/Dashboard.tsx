import DataLoader from "@/components/DataLoader";
import AcademyAges from "@/components/reports/AcademyAges";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import IconButton, { type IconName } from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { plural } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useDashboardCounts } from "@/hooks/dashboard/useDashboardCounts";
import { useAgeReport } from "@/hooks/reports/useAgeReport";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { RefreshControl, ScrollView, View } from "react-native";

/** Admin: how big the academy is right now. */
const StatsScreen = () => {
  const router = useRouter();
  const countsQuery = useDashboardCounts();
  const ageReport = useAgeReport();

  const handleRefresh = () => {
    countsQuery.refetch();
    ageReport.refetch();
  };

  return (
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow="Administración"
        title="Estadísticas"
        right={
          <IconButton
            icon="document-text-outline"
            onPress={() => router.push("/private/admin/reports")}
            accessibilityLabel="Ver reportes"
          />
        }
      />
      <DataLoader query={countsQuery}>
        {(counts, isRefetching) => {
          const tiles: { n: number; label: string; icon: IconName }[] = [
            { n: counts.activeTeachers, label: "Profesores activos", icon: "person-outline" },
            { n: counts.courses, label: "Cursos", icon: "book-outline" },
            { n: counts.classes, label: "Clases", icon: "calendar-outline" },
            { n: counts.approvedEnrollments, label: "Matrículas aprobadas", icon: "checkmark" },
          ];
          return (
            <ScrollView
              contentContainerClassName="pb-8"
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
            >
              <View className="mx-3 mt-4 rounded-[22px] bg-ink p-[18px]">
                <AppText variant="label" tone="hero-muted" className="text-[10px]">
                  Estudiantes activos
                </AppText>
                <AppText variant="heavy" tone="inverse" className="mt-2 text-[56px] leading-[60px]">
                  {counts.activeStudents}
                </AppText>
                <AppText tone="hero-soft" className="mt-1.5 text-[13.5px]">
                  {`En ${plural(counts.courses, "curso", "cursos")} y ${plural(counts.branches, "sede", "sedes")}`}
                </AppText>
              </View>

              <View className="flex-row flex-wrap gap-2.5 px-3 pt-2.5">
                {tiles.map((tile) => (
                  <Card key={tile.label} className="grow basis-[45%] gap-2.5">
                    <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-sand">
                      <Ionicons name={tile.icon} size={18} color={palette.ink} />
                    </View>
                    <View>
                      <AppText variant="heavy" className="text-[28px] leading-[32px]">
                        {tile.n}
                      </AppText>
                      <AppText tone="muted" className="text-[13px]">
                        {tile.label}
                      </AppText>
                    </View>
                  </Card>
                ))}
              </View>

              <AcademyAges report={ageReport} />
            </ScrollView>
          );
        }}
      </DataLoader>
    </Screen>
  );
};

export default StatsScreen;
